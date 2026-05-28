const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const voucher = sequelize.define(
  "voucher",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    type: {
      type: DataTypes.ENUM("fixed", "percent"),
      allowNull: false,
    },

    value: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    minAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    maxDiscount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    usageLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    usedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    isOneTimePerUser: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "vouchers",
    timestamps: true,
  }
);

module.exports = voucher;