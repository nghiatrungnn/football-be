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

  // giờ mở sân
  open_time: {
    type: DataTypes.STRING,
    defaultValue: "06:00",
  },

  // giờ đóng sân
  close_time: {
    type: DataTypes.STRING,
    defaultValue: "23:00",
  },

  // mỗi slot = 30 phút
  slot_duration: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
  },

  image: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },

  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
});

module.exports = Field;