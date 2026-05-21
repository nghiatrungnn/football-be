const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

const authMiddleware = require("../middlewares/authMiddleware");

// ================= USERS =================

// GET ALL USERS
router.get(
  "/users",
  authController.getAllUsers
);

// UPDATE USER
router.put(
  "/users/:id",
  authController.updateUser
);

// DELETE USER
router.delete(
  "/users/:id",
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
  authController.getMe
);

// UPDATE NAME
router.put(
  "/update-name",
  authController.updateName
);

module.exports = router;