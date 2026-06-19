const { Sequelize } = require('sequelize');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/social_network';

console.log('Connecting to database:', databaseUrl.replace(/:[^:]*@/, ':****@'));

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
