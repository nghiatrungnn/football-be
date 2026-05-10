const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// GET all users
router.get("/users", authController.getAllUsers);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/google", authController.loginGoogle);

module.exports = router;