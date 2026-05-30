const jwt = require("jsonwebtoken");

// ================= CHECK JWT SECRET =================
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing"
  );
}

module.exports = (
  req,
  res,
  next
) => {

  try {

    const authHeader =
      req.headers.authorization;

    // ================= NO TOKEN =================
    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized",
      });
    }

    // ================= GET TOKEN =================
    const token =
      authHeader.split(" ")[1];

    // ================= VERIFY =================
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    // ================= ATTACH USER =================
    req.user = {
      id: Number(decoded.id),
      email: decoded.email,
      role: decoded.role,
    };

    next();

  } catch (err) {

  console.error("AUTH ERROR:", err);

  return res.status(401).json({
    success: false,
    message: err.message,
    error: err.name,
  });
}

    // ================= TOKEN EXPIRED =================
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

    return res.status(401).json({
      success: false,
      message:
        "Invalid token",
    });
  }
