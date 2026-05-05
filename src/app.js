const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

// routes
const authRoutes = require("./routes/authRoutes");
const fieldRoutes = require("./routes/fieldRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/bookings", bookingRoutes);

// static file (upload ảnh)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

module.exports = app;