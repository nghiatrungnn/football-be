const sequelize = require("../config/db");

// 🔥 import models
const User = require("./User");
const Field = require("./Field");
const Booking = require("./Booking");

// 🔥 relationships
User.hasMany(Booking, { foreignKey: "userId" });
Booking.belongsTo(User, { foreignKey: "userId" });

Field.hasMany(Booking, { foreignKey: "fieldId" });
Booking.belongsTo(Field, { foreignKey: "fieldId" });

// 🔥 export
module.exports = {
  sequelize,
  User,
  Field,
  Booking,
};