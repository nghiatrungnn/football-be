module.exports = (req, res, next) => {
  try {
    console.log("USER:", req.user);

    // chưa đăng nhập hoặc token lỗi
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // không phải admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  } catch (err) {
    console.log("isAdmin error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};