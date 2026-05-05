const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Booking = sequelize.define(
  "booking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // 🔥 liên kết user (có thể null nếu khách vãng lai)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // 🔥 liên kết sân
    fieldId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // 🔥 thời gian
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // 🔥 thông tin người đặt (QUAN TRỌNG)
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // 🔥 trạng thái
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
      defaultValue: "confirmed",
    },

    // 🔥 tổng tiền
    total_price: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
  }
);

module.exports = Booking;