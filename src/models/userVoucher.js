const { DataTypes } =
  require("sequelize");

const sequelize =
  require("../config/db");

const userVoucher =
  sequelize.define(
    "userVoucher",
    {

      id: {
        type:
          DataTypes.INTEGER,

        primaryKey: true,

        autoIncrement: true,
      },

      userId: {
        type:
          DataTypes.INTEGER,

        allowNull: false,
      },

      voucherId: {
        type:
          DataTypes.INTEGER,

        allowNull: false,
      },

      bookingId: {
        type:
          DataTypes.INTEGER,

        allowNull: false,
      },

      usedAt: {
        type:
          DataTypes.DATE,

        defaultValue:
          DataTypes.NOW,
      },
    },

    {
      tableName:
        "user_vouchers",

      timestamps: true,
    }
  );

module.exports =
  userVoucher;