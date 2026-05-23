const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FieldPricing = sequelize.define("field_pricing", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  fieldId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  start_time: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  end_time: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  price_per_hour: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // normal | peak | night
  label: {
    type: DataTypes.STRING,
    defaultValue: "normal",
  },
});

module.exports = FieldPricing;