const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Booking = sequelize.define(
  "booking",
  {
    // ================= ID =================
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ================= USER =================
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ================= FIELD =================
    fieldId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ================= BOOKING DATE =================
    booking_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    // ================= TIME =================
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // ================= CUSTOMER INFO =================
    // allowNull true để HOLD slot không bị lỗi
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    // ================= STATUS =================
    status: {
      type: DataTypes.ENUM(
        "holding",
        "booked",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "holding",
    },

    // ================= HOLD EXPIRE =================
    hold_until: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // ================= PRICE =================
    total_price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "bookings",
    timestamps: true,

    // tránh sequelize tự đổi tên bảng
    freezeTableName: true,
  }
);

module.exports = Booking;