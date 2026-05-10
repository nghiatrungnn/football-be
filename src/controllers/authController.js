const { user: User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// ================= HELPER =================
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
});

// ================= GET ALL USERS =================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: {
        exclude: ["password"], // ẩn password
      },
    });

    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Get users failed",
      error: error.message,
    });
  }
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    email = email.trim().toLowerCase();
    name = name.trim();

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const exist = await User.findOne({ where: { email } });

    if (exist) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash,
      role: "user",
    });

    return res.json({
      message: "Register success",
      token: generateToken(user),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Register failed",
      error: error.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "Please login with Google",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    return res.json({
      message: "Login success",
      token: generateToken(user),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// ================= GOOGLE LOGIN (FIX CHUẨN ACCESS TOKEN) =================
exports.loginGoogle = async (req, res) => {
  try {
    // 🔥 SỬA: nhận access_token từ Flutter
    const { access_token } = req.body;

    console.log("BODY:", req.body); // debug

    if (!access_token) {
      return res.status(400).json({
        message: "Missing access_token",
      });
    }

    // 👉 gọi Google API lấy user info
    const googleRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const data = googleRes.data;

    if (!data.email) {
      return res.status(400).json({
        message: "Cannot get email from Google",
      });
    }

    const email = data.email.toLowerCase();
    const name = data.name || "Google User";
    const picture = data.picture || null;
    const googleId = data.sub;

    // ================= FIND USER =================
    let user = await User.findOne({ where: { email } });

    // ================= CREATE USER =================
    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        role: "user",
        googleId,
        avatar: picture,
      });
    }

    // ================= UPDATE GOOGLE INFO =================
    if (!user.googleId) {
      user.googleId = googleId;
      user.avatar = picture;
      await user.save();
    }

    return res.json({
      message: "Google login success",
      token: generateToken(user),
      user: formatUser(user),
    });
  } catch (err) {
    console.error("Google login error:", err.response?.data || err.message);

    return res.status(400).json({
      message: "Google login failed",
      error: err.response?.data || err.message,
    });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    return res.json({
      message: "Reset password feature coming soon",
      email: email.trim().toLowerCase(),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({
      message: "Error",
      error: err.message,
    });
  }
};