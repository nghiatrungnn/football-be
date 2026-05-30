const { DataTypes } =
  require("sequelize");

const sequelize =
  require("../config/db");

const Notification =
  sequelize.define(
    "notification",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      userId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "users",
    key: "id",
  },
},

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      // booking
      // payment
      // refund
      // review
      // promotion
      // system
      type: {
        type: DataTypes.STRING,
        defaultValue: "system",
      },

      // icon hiển thị trên app
      icon: {
        type: DataTypes.STRING,
        defaultValue: "notifications",
      },

      // route mở khi click
      route: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // id đơn đặt sân / giao dịch...
      referenceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },

    {
      timestamps: true,
    }
  );

module.exports =
  Notification;