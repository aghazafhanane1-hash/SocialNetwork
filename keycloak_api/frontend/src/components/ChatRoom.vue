<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { socket } from "../socket";
import { fetchChannels, createChannel } from "../services/channelService";

const props = defineProps({
  username: String,
  connected: Boolean,
});

const channels = ref([]); // { id, name, description }
const activeChannelId = ref(null);
const messages = ref([]); // normalisés : { id, username, text, time }
const onlineUsers = ref([]); // { username, keycloakId, activeChannelId }
const draft = ref("");
const error = ref("");
const messagesEl = ref(null);

const newChannelName = ref("");

// Normalise un message du backend vers le format d'affichage
function normalize(m) {
  return {
    id: m.id,
    username: m.senderUsername,
    text: m.content,
    time: m.createdAt,
  };
}

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
}

// --- Handlers socket (événements RÉELS du backend) ---
function onOnlineUsers(list) {
  onlineUsers.value = Array.isArray(list) ? list : [];
}

function onChannelHistory({ channelId, messages: history }) {
  if (channelId !== activeChannelId.value) return;
  messages.value = (history || []).map(normalize);
  scrollToBottom();
}

function onNewMessage(m) {
  if (m.channelId !== activeChannelId.value) return;
  messages.value.push(normalize(m));
  scrollToBottom();
}

function onChannelCreated(channel) {
  if (!channels.value.some((c) => c.id === channel.id)) {
    channels.value.push(channel);
  }
}

// (Re)joindre le channel actif — appelé à la connexion et au changement de salon
function joinActiveChannel() {
  if (activeChannelId.value != null && socket.connected) {
    socket.emit("join_channel", { channelId: activeChannelId.value });
  }
}

function onConnect() {
  joinActiveChannel();
}

onMounted(async () => {
  socket.on("connect", onConnect);
  socket.on("online_users", onOnlineUsers);
  socket.on("channel_history", onChannelHistory);
  socket.on("new_message", onNewMessage);
  socket.on("channel_created", onChannelCreated);

  // Récupère les channels via REST, puis rejoint le premier (ou "general")
  try {
    const list = await fetchChannels();
    channels.value = list || [];
    const general = channels.value.find((c) => c.name === "general");
    const first = general || channels.value[0];
    if (first) selectChannel(first.id);
  } catch (e) {
    error.value = "Impossible de charger les salons : " + e.message;
  }
});

onUnmounted(() => {
  socket.off("connect", onConnect);
  socket.off("online_users", onOnlineUsers);
  socket.off("channel_history", onChannelHistory);
  socket.off("new_message", onNewMessage);
  socket.off("channel_created", onChannelCreated);
});

// Sélection d'un salon
function selectChannel(id) {
  if (id === activeChannelId.value) return;
  activeChannelId.value = id;
  messages.value = []; // l'historique arrivera via "channel_history"
  joinActiveChannel();
}

// Envoi d'un message
function send() {
  const content = draft.value.trim();
  if (!content || activeChannelId.value == null) return;
  socket.emit("send_message", { channelId: activeChannelId.value, content });
  draft.value = "";
}

// Création d'un salon (le serveur diffuse ensuite "channel_created")
async function addChannel() {
  const name = newChannelName.value.trim();
  if (!name) return;
  error.value = "";
  try {
    await createChannel({ name });
    newChannelName.value = "";
  } catch (e) {
    error.value = "Échec de la création du salon : " + e.message;
  }
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function initial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function activeChannelName() {
  const c = channels.value.find((c) => c.id === activeChannelId.value);
  return c ? c.name : "";
}
</script>

<template>
  <div class="chat">
    <!-- Colonne gauche : liste des salons -->
    <aside class="channels">
      <div class="col-title">Salons</div>
      <ul class="channel-list">
        <li
          v-for="c in channels"
          :key="c.id"
          class="channel-item"
          :class="{ active: c.id === activeChannelId }"
          @click="selectChannel(c.id)"
        >
          <span class="hash">#</span>{{ c.name }}
        </li>
      </ul>
      <div class="new-channel">
        <input
          v-model="newChannelName"
          type="text"
          placeholder="nouveau-salon"
          @keyup.enter="addChannel"
        />
        <button @click="addChannel">+</button>
      </div>
    </aside>

    <!-- Colonne centrale : messages -->
    <section class="main">
      <header class="header">
        <div class="room-info">
          <span class="hash">#</span>
          <span class="room-name">{{ activeChannelName() }}</span>
        </div>
        <span class="online">
          <span class="dot" :class="{ off: !connected }"></span>
          {{ connected ? "connecté" : "déconnecté" }}
        </span>
      </header>

      <div ref="messagesEl" class="messages">
        <p v-if="error" class="error">{{ error }}</p>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
          :class="{ mine: msg.username === username }"
        >
          <div class="avatar">{{ initial(msg.username) }}</div>
          <div class="bubble-wrap">
            <div class="meta">
              <span class="author">{{
                msg.username === username ? "vous" : msg.username
              }}</span>
              <span class="time">{{ formatTime(msg.time) }}</span>
            </div>
            <div class="bubble">{{ msg.text }}</div>
          </div>
        </div>
      </div>

      <footer class="composer">
        <input
          v-model="draft"
          type="text"
          placeholder="Écrire un message…"
          @keyup.enter="send"
        />
        <button class="send" :disabled="!draft.trim()" @click="send">➤</button>
      </footer>
    </section>

    <!-- Colonne droite : utilisateurs en ligne -->
    <aside class="sidebar">
      <div class="col-title">En ligne — {{ onlineUsers.length }}</div>
      <ul class="user-list">
        <li v-for="u in onlineUsers" :key="u.keycloakId" class="user-item">
          <span class="u-avatar">{{ initial(u.username) }}</span>
          <span class="u-name">{{
            u.username === username ? u.username + " (vous)" : u.username
          }}</span>
          <span class="u-dot"></span>
        </li>
      </ul>
    </aside>
  </div>
</template>

<style scoped>
.chat {
  width: 100%;
  height: 70vh;
  min-height: 560px;
  display: flex;
  flex-direction: row;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
.channels {
  flex: 0 0 190px;
  border-right: 1px solid #eef0f2;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  padding: 14px 0;
}
.col-title {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0 16px 10px;
}
.channel-list {
  list-style: none;
  flex: 1;
  overflow-y: auto;
}
.channel-item {
  padding: 7px 16px;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
}
.channel-item .hash {
  color: #9ca3af;
  margin-right: 4px;
}
.channel-item:hover {
  background: #f1f3f5;
}
.channel-item.active {
  background: #e0e7ff;
  color: #3730a3;
  font-weight: 500;
}
.new-channel {
  display: flex;
  gap: 6px;
  padding: 10px 12px 0;
}
.new-channel input {
  flex: 1;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.new-channel button {
  width: 32px;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eef0f2;
}
.room-info {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hash {
  color: #9ca3af;
  font-size: 18px;
}
.room-name {
  font-weight: 600;
}
.online {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
}
.dot.off {
  background: #d1d5db;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.error {
  color: #dc2626;
  font-size: 13px;
}
.message {
  display: flex;
  gap: 10px;
  max-width: min(75%, 460px);
}
.message.mine {
  flex-direction: row-reverse;
  align-self: flex-end;
}
.avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ddd6fe;
  color: #5b21b6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}
.message.mine .avatar {
  background: #bfdbfe;
  color: #1e40af;
}
.meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}
.message.mine .meta {
  flex-direction: row-reverse;
}
.author {
  font-size: 13px;
  font-weight: 600;
}
.time {
  font-size: 11px;
  color: #9ca3af;
}
.bubble {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 2px 10px 10px 10px;
  font-size: 14px;
  word-break: break-word;
}
.message.mine .bubble {
  background: #2563eb;
  color: #fff;
  border-radius: 10px 2px 10px 10px;
}
.composer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #eef0f2;
}
.composer input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}
.composer input:focus {
  border-color: #2563eb;
}
.send {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}
.send:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
.sidebar {
  flex: 0 0 200px;
  border-left: 1px solid #eef0f2;
  background: #fafafa;
  padding: 14px 0;
  overflow-y: auto;
}
.user-list {
  list-style: none;
}
.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px;
}
.u-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ddd6fe;
  color: #5b21b6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}
.u-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.u-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
  flex-shrink: 0;
}
</style>
