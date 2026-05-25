const { user: User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// ================= CHECK JWT SECRET =================
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing in .env"
  );
}

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
  phone: user.phone || "",
  role: user.role,
  avatar: user.avatar || "",
});

// ================= VALIDATE EMAIL =================
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};

// ================= GET ALL USERS =================
exports.getAllUsers = async (
  req,
  res
) => {
  try {
    const users = await User.findAll({
      attributes: {
        exclude: ["password"],
      },
      order: [["id", "DESC"]],
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
      phone,
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

    name = name.trim();

    email = email
      .trim()
      .toLowerCase();

    if (phone) {
      phone = phone.trim();
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    // CHECK EXIST EMAIL
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

    // CHECK EXIST PHONE
    if (phone) {
      const existPhone =
        await User.findOne({
          where: { phone },
        });

      if (existPhone) {
        return res.status(400).json({
          message:
            "Phone already exists",
        });
      }
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
        phone,
        role: "user",
      });

    return res.status(201).json({
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
          phone: null,
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

// ================= UPDATE PROFILE =================
exports.updateProfile = async (
  req,
  res
) => {
  try {
    const { name, phone, email, avatar } =
      req.body;

    // CHECK DATA
    if (!name && !phone && !email && !avatar) {
      return res.status(400).json({
        message:
          "Nothing to update",
      });
    }

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

    // CHECK PHONE EXIST
    if (phone) {
      const existPhone =
        await User.findOne({
          where: { phone },
        });

      if (
        existPhone &&
        existPhone.id !==
          user.id
      ) {
        return res.status(400).json({
          message:
            "Phone already exists",
        });
      }
    }

    // UPDATE NAME
if (name) {
  user.name =
    name.trim();
}

// UPDATE PHONE
if (phone) {
  user.phone =
    phone.trim();
}

// UPDATE EMAIL
if (email) {
  const newEmail =
    email
      .trim()
      .toLowerCase();

  // VALIDATE EMAIL
  if (
    !validateEmail(newEmail)
  ) {
    return res.status(400).json({
      message:
        "Invalid email",
    });
  }

  // CHECK EXIST EMAIL
  const existEmail =
    await User.findOne({
      where: {
        email: newEmail,
      },
    });

  if (
    existEmail &&
    existEmail.id !==
      user.id
  ) {
    return res.status(400).json({
      message:
        "Email already exists",
    });
  }

  user.email = newEmail;
}

// UPDATE AVATAR
if (avatar) {
  user.avatar =
    avatar.trim();
}

    await user.save();

    return res.json({
      message:
        "Update profile success",

      user: formatUser(user),
    });
  } catch (err) {
    console.error(
      "Update profile error:",
      err
    );

    return res.status(500).json({
      message:
        "Update failed",
      error: err.message,
    });
  }
};

// ================= UPDATE AVATAR =================
exports.updateAvatar = async (
  req,
  res
) => {
  try {
    const { avatar } =
      req.body;

    if (!avatar) {
      return res.status(400).json({
        message:
          "Avatar is required",
      });
    }

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

    // UPDATE AVATAR
    user.avatar =
      avatar.trim();

    await user.save();

    return res.json({
      message:
        "Update avatar success",

      user: formatUser(user),
    });
  } catch (err) {
    console.error(
      "Update avatar error:",
      err
    );

    return res.status(500).json({
      message:
        "Update avatar failed",
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

// ================= UPDATE USER (ADMIN) =================
exports.updateUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      role,
    } = req.body;

    const user =
      await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    // CHECK EMAIL EXIST
    if (email) {
      const exist =
        await User.findOne({
          where: {
            email:
              email
                .trim()
                .toLowerCase(),
          },
        });

      if (
        exist &&
        exist.id !== user.id
      ) {
        return res.status(400).json({
          message:
            "Email already exists",
        });
      }

      user.email =
        email
          .trim()
          .toLowerCase();
    }

    // CHECK PHONE EXIST
    if (phone) {
      const existPhone =
        await User.findOne({
          where: { phone },
        });

      if (
        existPhone &&
        existPhone.id !==
          user.id
      ) {
        return res.status(400).json({
          message:
            "Phone already exists",
        });
      }

      user.phone =
        phone.trim();
    }

    if (name) {
      user.name =
        name.trim();
    }

    if (role) {
      user.role = role;
    }

    await user.save();

    return res.json({
      message:
        "Update user success",

      user: formatUser(user),
    });
  } catch (err) {
    console.error(
      "Update user error:",
      err
    );

    return res.status(500).json({
      message:
        "Update user failed",
      error: err.message,
    });
  }
};

// ================= DELETE USER (ADMIN) =================
exports.deleteUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // BLOCK SELF DELETE
    if (
      Number(id) ===
      req.user.id
    ) {
      return res.status(400).json({
        message:
          "Cannot delete yourself",
      });
    }

    const user =
      await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    await user.destroy();

    return res.json({
      message:
        "Delete user success",
    });
  } catch (err) {
    console.error(
      "Delete user error:",
      err
    );

    return res.status(500).json({
      message:
        "Delete user failed",
      error: err.message,
    });
  }
};