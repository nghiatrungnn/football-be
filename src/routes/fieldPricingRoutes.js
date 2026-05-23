const express = require("express");
const router = express.Router();

const {
  createPricing,
  getPricingByField,
} = require("../controllers/fieldPricingController");

// tạo khung giá
router.post("/", createPricing);

// lấy khung giá theo sân
router.get("/:fieldId", getPricingByField);

module.exports = router;