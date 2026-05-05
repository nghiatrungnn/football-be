const sequelize = require("../config/db");

// Import models
const User = require("./user");
const Field = require("./field");
const Booking = require("./booking");

// ===============================
// RELATIONSHIPS
// ===============================

// User - Booking (1-N)
User.hasMany(Booking, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Booking.belongsTo(User, {
  foreignKey: "userId",
});

// Field - Booking (1-N)
Field.hasMany(Booking, {
  foreignKey: "fieldId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Booking.belongsTo(Field, {
  foreignKey: "fieldId",
});

// ===============================
// EXPORT
// ===============================
module.exports = {
  sequelize,
  User,
  Field,
  Booking,
};