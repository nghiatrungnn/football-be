const sequelize = require("../config/db");

// Import models
const user = require("./user");
const field = require("./field");
const booking = require("./booking");
const FieldPricing = require("./FieldPricing");
const userVoucher =
  require("./userVoucher");
const voucher = require("./voucher");
const Review = require("./review");
const Notification = require("./notification");

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
// Field - Pricing (1-N)
// ===============================

field.hasMany(FieldPricing, {
  foreignKey: "fieldId",
  as: "pricingRules",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

FieldPricing.belongsTo(field, {
  foreignKey: "fieldId",
});

// ===============================
// User - UserVoucher
// ===============================

user.hasMany(userVoucher, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

userVoucher.belongsTo(user, {
  foreignKey: "userId",
});

// ===============================
// Voucher - UserVoucher
// ===============================

voucher.hasMany(userVoucher, {
  foreignKey: "voucherId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

userVoucher.belongsTo(voucher, {
  foreignKey: "voucherId",
});

// ===============================
// Booking - UserVoucher
// ===============================

booking.hasMany(userVoucher, {
  foreignKey: "bookingId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

userVoucher.belongsTo(booking, {
  foreignKey: "bookingId",
});

// ===============================
// User - Review
// ===============================

user.hasMany(Review, {
  foreignKey: "userId",
});

Review.belongsTo(user, {
  foreignKey: "userId",
});

// ===============================
// Field - Review
// ===============================

field.hasMany(Review, {
  foreignKey: "fieldId",
});

Review.belongsTo(field, {
  foreignKey: "fieldId",
});

// ===============================
// User - Notification
// ===============================

user.hasMany(Notification, {
  foreignKey: "userId",
});

Notification.belongsTo(user, {
  foreignKey: "userId",
});

// ===============================
// EXPORT
// ===============================

module.exports = {
  sequelize,
  user,
  field,
  booking,
  FieldPricing,
  userVoucher,
  voucher,
  Review,
  Notification,
};