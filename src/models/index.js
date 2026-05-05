const sequelize = require("../config/db");

// Import models
const user = require("./user");
const field = require("./field");
const booking = require("./booking");

// ===============================
// RELATIONSHIPS
// ===============================

// User - Booking (1-N)
user.hasMany(booking, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

booking.belongsTo(user, {
  foreignKey: "userId",
});

// Field - Booking (1-N)
field.hasMany(booking, {
  foreignKey: "fieldId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

booking.belongsTo(field, {
  foreignKey: "fieldId",
});

// ===============================
// EXPORT
// ===============================
module.exports = {
  sequelize,
  user,
  field,
  booking,
};