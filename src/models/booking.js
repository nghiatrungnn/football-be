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

    // ================= DATE =================
    booking_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // ================= TIME =================
    start_time: {
  type: DataTypes.TIME,
  allowNull: false,
},

end_time: {
  type: DataTypes.TIME,
  allowNull: false,
},

    // ================= CUSTOMER =================
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

    // ================= PAYMENT METHOD =================
    payment_method: {
      type: DataTypes.ENUM(
        "cash",
        "banking"
      ),

      allowNull: false,

      defaultValue: "cash",
    },

    // ================= PAYMENT STATUS =================
    payment_status: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "failed",
      ),

      allowNull: false,

      defaultValue: "pending",
    },

    // ================= TRANSACTION CODE =================
    transaction_code: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    // ================= PAYMENT NOTE =================
    payment_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    // ================= STATUS =================
    status: {
      type: DataTypes.ENUM(
        "holding",
        "booked",
        "completed",
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

    // ================= CREATED AT =================
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ================= UPDATED AT =================
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },

  {
    tableName: "bookings",

    timestamps: true,

    freezeTableName: true,

    // ================= UNIQUE SLOT =================
  }
);

module.exports = Booking;