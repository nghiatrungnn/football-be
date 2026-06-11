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
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "users",
    key: "id",
  },
},

      voucherId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "vouchers",
    key: "id",
  },
},

    bookingId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: "bookings",
    key: "id",
  },
},

      usedAt: {
  type: DataTypes.DATE,

  allowNull: true,
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