const jwt = require("jsonwebtoken");

// ================= CHECK JWT SECRET =================
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing in .env"
  );
}

/**
 * ================= AUTH MIDDLEWARE =================
 * JWT Authentication Middleware
 *
 * Header format:
 * Authorization: Bearer TOKEN
 */
module.exports = async (
  req,
  res,
  next
) => {
  try {
    // ================= GET AUTH HEADER =================
    const authHeader =
      req.headers.authorization;

    // NO HEADER
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "No token provided",
      });
    }

    // ================= CHECK FORMAT =================
    const parts =
      authHeader.split(" ");

    // MUST: Bearer TOKEN
    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token format. Use: Bearer TOKEN",
      });
    }

    // ================= GET TOKEN =================
    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Token is missing",
      });
    }

    // ================= VERIFY TOKEN =================
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // TOKEN INVALID
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token",
      });
    }

    // ================= ATTACH USER =================
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // ================= NEXT =================
    next();
  } catch (err) {
    console.error(
      "JWT AUTH ERROR:",
      err.message
    );

    // TOKEN EXPIRED
    if (
      err.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Token expired",
      });
    }

    // INVALID TOKEN
    if (
      err.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token",
      });
    }

    // SERVER ERROR
    return res.status(500).json({
      success: false,
      message:
        "Authentication failed",
      error: err.message,
    });
  }
};