const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

// routes
const authRoutes = require("./routes/authRoutes");
const fieldRoutes = require("./routes/fieldRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const fieldPricingRoutes = require("./routes/fieldPricingRoutes");
const reviewRoutes = require('./routes/reviewRoutes');

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/bookings", bookingRoutes);

// static file (upload ảnh)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// field pricing routes
app.use("/api/field-pricing", fieldPricingRoutes);

// review routes
app.use('/api/reviews', reviewRoutes);

// payment routes
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

module.exports = app;