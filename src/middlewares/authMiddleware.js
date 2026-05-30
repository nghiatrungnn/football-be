const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token =
      authHeader.split(" ")[1];

    console.log(
      "VERIFY SECRET =",
      process.env.JWT_SECRET
    );

    console.log(
      "TOKEN RECEIVED =",
      token
    );

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = {
      id: Number(decoded.id),
      email: decoded.email,
      role: decoded.role,
    };

    next();

  } catch (err) {

    console.error(
      "AUTH ERROR:",
      err
    );

    if (
      err.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: err.message,
    });
  }
};