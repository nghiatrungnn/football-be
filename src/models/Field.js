const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Field = sequelize.define("Field", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
  },

  type: {
    type: DataTypes.STRING,
    defaultValue: "Sân 5",
  },

  price_per_hour: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // ⚠️ Lưu JSON array ảnh
  images: {
    type: DataTypes.JSON, // ["url1", "url2"]
    defaultValue: [],
  },
});

module.exports = Field;