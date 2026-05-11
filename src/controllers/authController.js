const { user: User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// ================= GENERATE TOKEN =================
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ================= FORMAT USER =================
const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || "",
});

// ================= GET ALL USERS =================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: {
        exclude: ["password"],
      },
    });

    return res.json(users);
  } catch (error) {
    console.error(
      "Get users error:",
      error
    );

    return res.status(500).json({
      message: "Get users failed",
      error: error.message,
    });
  }
};

// ================= REGISTER =================
exports.register = async (
  req,
  res
) => {
  try {
    let {
      name,
      email,
      password,
    } = req.body;

    // VALIDATE
    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "Missing fields",
      });
    }

    email = email
      .trim()
      .toLowerCase();

    name = name.trim();

    // PASSWORD LENGTH
    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    // CHECK EXIST
    const exist =
      await User.findOne({
        where: { email },
      });

    if (exist) {
      return res.status(400).json({
        message:
          "Email already exists",
      });
    }

    // HASH PASSWORD
    const hash =
      await bcrypt.hash(
        password,
        10
      );

    // CREATE USER
    const user =
      await User.create({
        name,
        email,
        password: hash,
        role: "user",
      });

    return res.json({
      message: "Register success",

      token:
        generateToken(user),

      user: formatUser(user),
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      message: "Register failed",
      error: error.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (
  req,
  res
) => {
  try {
    let { email, password } =
      req.body;

    // VALIDATE
    if (!email || !password) {
      return res.status(400).json({
        message: "Missing fields",
      });
    }

    email = email
      .trim()
      .toLowerCase();

    // FIND USER
    const user =
      await User.findOne({
        where: { email },
      });

    if (!user) {
      return res.status(400).json({
        message:
          "User not found",
      });
    }

    // GOOGLE ACCOUNT
    if (!user.password) {
      return res.status(400).json({
        message:
          "Please login with Google",
      });
    }

    // CHECK PASSWORD
    const match =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!match) {
      return res.status(400).json({
        message:
          "Wrong password",
      });
    }

    return res.json({
      message: "Login success",

      token:
        generateToken(user),

      user: formatUser(user),
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// ================= GOOGLE LOGIN =================
exports.loginGoogle = async (
  req,
  res
) => {
  try {
    const { access_token } =
      req.body;

    console.log(
      "GOOGLE BODY:",
      req.body
    );

    // CHECK TOKEN
    if (!access_token) {
      return res.status(400).json({
        message:
          "Missing access_token",
      });
    }

    // GET GOOGLE USER INFO
    const googleRes =
      await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

    const data =
      googleRes.data;

    // CHECK EMAIL
    if (!data.email) {
      return res.status(400).json({
        message:
          "Cannot get email from Google",
      });
    }

    const email =
      data.email.toLowerCase();

    const name =
      data.name ||
      "Google User";

    const picture =
      data.picture || "";

    const googleId =
      data.sub;

    // FIND USER
    let user =
      await User.findOne({
        where: { email },
      });

    // CREATE USER
    if (!user) {
      user =
        await User.create({
          name,
          email,
          password: null,
          role: "user",
          googleId,
          avatar: picture,
        });
    }

    // UPDATE GOOGLE INFO
    if (!user.googleId) {
      user.googleId =
        googleId;

      user.avatar =
        picture;

      await user.save();
    }

    return res.json({
      message:
        "Google login success",

      token:
        generateToken(user),

      user: formatUser(user),
    });
  } catch (err) {
    console.error(
      "Google login error:",
      err.response?.data ||
        err.message
    );

    return res.status(400).json({
      message:
        "Google login failed",

      error:
        err.response?.data ||
        err.message,
    });
  }
};

// ================= GET CURRENT USER =================
exports.getMe = async (
  req,
  res
) => {
  try {
    const user =
      await User.findByPk(
        req.user.id,
        {
          attributes: {
            exclude: [
              "password",
            ],
          },
        }
      );

    // USER NOT FOUND
    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    return res.json(
      formatUser(user)
    );
  } catch (err) {
    console.error(
      "Get me error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ================= UPDATE USER NAME =================
exports.updateName = async (
  req,
  res
) => {
  try {
    const { name } =
      req.body;

    // VALIDATE
    if (!name) {
      return res.status(400).json({
        message:
          "Name is required",
      });
    }

    // FIND USER
    const user =
      await User.findByPk(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    // UPDATE NAME
    user.name = name.trim();

    await user.save();

    return res.json({
      message:
        "Update name success",

      user: formatUser(user),
    });
  } catch (err) {
    console.error(
      "Update name error:",
      err
    );

    return res.status(500).json({
      message:
        "Update failed",
      error: err.message,
    });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword =
  async (req, res) => {
    try {
      const { email } =
        req.body;

      if (!email) {
        return res.status(400).json({
          message:
            "Email is required",
        });
      }

      return res.json({
        message:
          "Reset password feature coming soon",

        email: email
          .trim()
          .toLowerCase(),
      });
    } catch (err) {
      console.error(
        "Forgot password error:",
        err
      );

      return res.status(500).json({
        message: "Error",
        error: err.message,
      });
    }
  };