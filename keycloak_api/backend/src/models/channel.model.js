const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-zA-Z0-9-_]+$/
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Channel;
