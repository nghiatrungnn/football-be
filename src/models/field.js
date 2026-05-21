const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Field = sequelize.define("field", {
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

  // ✅ Ảnh đại diện từ link internet
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },

  // ✅ Danh sách nhiều ảnh
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
});

module.exports = Field;