const jwt = require("jsonwebtoken");

/**
 * AUTH MIDDLEWARE (JWT)
 * Dùng cho tất cả route cần đăng nhập
 */
module.exports = (req, res, next) => {
  try {
    // ================= GET TOKEN =================
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    // Format: Bearer <token>
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid token format (must be Bearer <token>)",
      });
    }

    // ================= VERIFY TOKEN =================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ================= ATTACH USER =================
    req.user = decoded;

    next();
  } catch (err) {
    console.log("JWT AUTH ERROR:", err.message);

    return res.status(401).json({
      message: "Unauthorized - invalid or expired token",
    });
  }
};