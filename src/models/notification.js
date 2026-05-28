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

      // USER NHẬN
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // TIÊU ĐỀ
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // NỘI DUNG
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      // LOẠI
      type: {
        type: DataTypes.STRING,
        defaultValue: "system",
      },

      // ĐÃ ĐỌC CHƯA
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