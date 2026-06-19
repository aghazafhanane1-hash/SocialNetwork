const sequelize = require('../config/db');
const User = require('./user.model');
const Channel = require('./channel.model');
const Message = require('./message.model');

Channel.hasMany(Message, {
  foreignKey: {
    name: 'channelId',
    allowNull: false
  },
  onDelete: 'CASCADE'
});
Message.belongsTo(Channel, {
  foreignKey: {
    name: 'channelId',
    allowNull: false
  }
});

User.hasMany(Message, {
  foreignKey: 'userId',
  onDelete: 'SET NULL'
});
Message.belongsTo(User, {
  foreignKey: 'userId',
  constraints: false
});

const initDb = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    const count = await Channel.count();
    if (count === 0) {
      await Channel.bulkCreate([
        { name: 'general', description: 'Discussion générale pour tous les membres' },
        { name: 'loisirs', description: 'Partagez vos passions, musiques, films et sorties' },
        { name: 'technologie', description: 'Discussions autour du développement, devops et tech' }
      ]);
      console.log('Default channels seeded.');
    }
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Channel,
  Message,
  initDb
};
