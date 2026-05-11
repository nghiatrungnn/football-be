const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // GET TOKEN
    const authHeader =
      req.headers.authorization;

    // NO TOKEN
    if (!authHeader) {
      return res.status(401).json({
        message: "No token",
      });
    }

    // FORMAT:
    // Bearer TOKEN
    const token =
      authHeader.split(" ")[1];

    // VERIFY TOKEN
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // SAVE USER
    req.user = decoded;

    next();
  } catch (err) {
    console.log(
      "Auth middleware error:",
      err
    );

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};