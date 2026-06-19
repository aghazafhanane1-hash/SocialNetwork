const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

dotenv.config();

const { initDb, User, Channel, Message } = require('./models');
const userRoutes = require('./routes/user.routes');
const { verifyToken } = require('./middleware/auth.middleware');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const KEYCLOAK_SERVER_URL = process.env.KEYCLOAK_SERVER_URL || 'http://keycloak:8080';
const REALM = process.env.KEYCLOAK_REALM || 'social-network';

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

app.get('/api/channels', verifyToken, async (req, res) => {
  try {
    const channels = await Channel.findAll({ order: [['id', 'ASC']] });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des channels.' });
  }
});

app.post('/api/channels', verifyToken, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Le nom du channel est obligatoire.' });
  }
  try {
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await Channel.findOne({ where: { name: normalizedName } });
    if (existing) {
      return res.status(400).json({ message: 'Un channel avec ce nom existe déjà.' });
    }
    const channel = await Channel.create({ name: normalizedName, description });

    io.emit('channel_created', channel);

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création du channel: ' + error.message });
  }
});

initDb();

const jwksClient = jwksRsa({
  jwksUri: `${KEYCLOAK_SERVER_URL}/realms/${REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  timeout: 30000
});

function getSocketKey(header, callback) {
  jwksClient.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey() || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error('Auth token missing'));
  }

  jwt.verify(token, getSocketKey, {}, (err, decoded) => {
    if (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Auth token invalid'));
    }

    socket.user = {
      keycloakId: decoded.sub,
      username: decoded.preferred_username,
      email: decoded.email
    };
    next();
  });
});

const onlineUsers = new Map();

const getOnlineUsersList = () => {
  const list = [];
  onlineUsers.forEach((user) => {
    if (!list.some(u => u.keycloakId === user.keycloakId)) {
      list.push({
        username: user.username,
        keycloakId: user.keycloakId,
        activeChannelId: user.activeChannelId
      });
    }
  });
  return list;
};

io.on('connection', (socket) => {
  console.log(`User connected to websocket: ${socket.user.username} (${socket.id})`);

  onlineUsers.set(socket.id, {
    username: socket.user.username,
    keycloakId: socket.user.keycloakId,
    activeChannelId: null
  });

  io.emit('online_users', getOnlineUsersList());

  socket.on('join_channel', async ({ channelId }) => {
    const currentUser = onlineUsers.get(socket.id);
    if (currentUser && currentUser.activeChannelId) {
      socket.leave(`channel_${currentUser.activeChannelId}`);
    }

    socket.join(`channel_${channelId}`);
    console.log(`Socket ${socket.id} (${socket.user.username}) joined room channel_${channelId}`);

    if (currentUser) {
      currentUser.activeChannelId = channelId;
      onlineUsers.set(socket.id, currentUser);
    }

    io.emit('online_users', getOnlineUsersList());

    try {
      const messages = await Message.findAll({
        where: { channelId },
        order: [['createdAt', 'ASC']],
        limit: 100
      });
      socket.emit('channel_history', { channelId, messages });
    } catch (error) {
      console.error('Error fetching message history:', error.message);
    }
  });

  socket.on('send_message', async ({ channelId, content }) => {
    if (!content || !content.trim()) return;

    try {
      const localUser = await User.findOne({ where: { keycloakId: socket.user.keycloakId } });
      const userId = localUser ? localUser.id : null;

      const msg = await Message.create({
        content: content.trim(),
        senderUsername: socket.user.username,
        channelId,
        userId
      });

      io.to(`channel_${channelId}`).emit('new_message', msg);
    } catch (error) {
      console.error('Error saving message:', error.message);
      socket.emit('error', { message: 'Impossible d\'envoyer le message.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected from websocket: ${socket.user.username} (${socket.id})`);
    onlineUsers.delete(socket.id);
    io.emit('online_users', getOnlineUsersList());
  });
});

server.listen(PORT, () => {
  console.log(`Social Network backend listening on port ${PORT}`);
});
