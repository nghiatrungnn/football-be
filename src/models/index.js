const sequelize = require("../config/db");

// 🔥 import models
const User = require("./user");
const Field = require("./field");
const Booking = require("./booking");

// ===============================
// 🔗 RELATIONSHIPS (ASSOCIATIONS)
// ===============================

// User - Booking (1-N)
User.hasMany(booking, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Booking.belongsTo(user, {
  foreignKey: "userId",
});

// Field - Booking (1-N)
Field.hasMany(booking, {
  foreignKey: "fieldId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Booking.belongsTo(field, {
  foreignKey: "fieldId",
});

// ===============================
// 🔥 EXPORT ALL
// ===============================
module.exports = {
  sequelize,
  user,
  field,
  booking,
};