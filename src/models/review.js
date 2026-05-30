const { DataTypes } = require("sequelize");

const sequelize =
  require("../config/db");

const Review =
  sequelize.define(
    "review",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      fieldId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "fields",
    key: "id",
  },
},

      userId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "users",
    key: "id",
  },
},

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = Review;