const express = require("express");

const router = express.Router();

const reviewController =
  require("../controllers/reviewController");

// ================= CREATE =================
router.post(
  "/",
  reviewController.createReview
);

// ================= GET ALL =================
router.get(
  "/",
  reviewController.getAllReviews
);

// ================= GET BY FIELD =================
router.get(
  "/field/:fieldId",
  reviewController.getReviews
);

// ================= UPDATE =================
router.put(
  "/:id",
  reviewController.updateReview
);

// ================= DELETE =================
router.delete(
  "/:id",
  reviewController.deleteReview
);

module.exports = router;