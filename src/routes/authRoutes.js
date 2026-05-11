const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// ================= USERS =================
router.get(
  "/users",
  authController.getAllUsers
);

// ================= AUTH =================
router.post(
  "/register",
  authController.register
);

router.post(
  "/login",
  authController.login
);

router.post(
  "/forgot-password",
  authController.forgotPassword
);

router.post(
  "/google",
  authController.loginGoogle
);

// ================= CURRENT USER =================
router.get(
  "/me",
  authMiddleware,
  authController.getMe
);

// ================= UPDATE NAME =================
router.put(
  "/update-name",
  authMiddleware,
  authController.updateName
);

module.exports = router;