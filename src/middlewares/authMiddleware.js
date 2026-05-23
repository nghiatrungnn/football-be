const jwt = require("jsonwebtoken");

// ================= CHECK JWT SECRET =================
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing in .env"
  );
}

/**
 * ================= AUTH MIDDLEWARE =================
 */
module.exports = (
  req,
  res,
  next
) => {
  try {
    // ================= GET HEADER =================
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "No token provided",
      });
    }

    // ================= CHECK BEARER =================
    if (
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token format",
      });
    }

    // ================= GET TOKEN =================
    const token =
      authHeader.split(" ")[1];

    // ================= VERIFY =================
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ================= ATTACH USER =================
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.error(
      "AUTH ERROR:",
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
    return res.status(401).json({
      success: false,
      message:
        "Invalid token",
    });
  }
};