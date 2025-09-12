const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Admin extends Model {}

Admin.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'admin',
  },
}, {
  sequelize,
  modelName: 'Admin',
  tableName: 'admins',
  timestamps: true,
});

module.exports = Admin;