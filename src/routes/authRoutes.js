const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

const authMiddleware = require("../middlewares/authMiddleware");

// ================= USERS =================

// GET ALL USERS
router.get(
  "/users",
  authMiddleware,
  authController.getAllUsers
);

// UPDATE USER
router.put(
  "/users/:id",
  authMiddleware,
  authController.updateUser
);

// DELETE USER
router.delete(
  "/users/:id",
  authMiddleware,
  authController.deleteUser
);

// ================= AUTH =================

// REGISTER
router.post(
  "/register",
  authController.register
);

// LOGIN
router.post(
  "/login",
  authController.login
);

// GOOGLE LOGIN
router.post(
  "/google",
  authController.loginGoogle
);

// FORGOT PASSWORD
router.post(
  "/forgot-password",
  authController.forgotPassword
);

// ================= CURRENT USER =================

// GET CURRENT USER
router.get(
  "/me",
  authMiddleware,
  authController.getMe
);

// UPDATE PROFILE
router.put(
  "/update-profile",
  authMiddleware,
  authController.updateProfile
);

// UPDATE AVATAR
router.put(
  "/update-avatar",
  authMiddleware,
  authController.updateAvatar
);

module.exports = router;