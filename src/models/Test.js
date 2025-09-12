const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Assuming you have a sequelize instance exported from database.js

class Test extends Model {}

Test.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Test',
  tableName: 'tests',
  timestamps: true,
});

module.exports = Test;