const express = require("express");

const router = express.Router();

const voucherController = require(
  "../controllers/voucherController"
);

// ================= GET ALL =================

router.get(
  "/",
  voucherController.getVouchers
);

// ================= GET DETAIL =================

router.get(
  "/:id",
  voucherController.getVoucherById
);

// ================= CREATE =================

router.post(
  "/",
  voucherController.createVoucher
);

// ================= UPDATE =================

router.put(
  "/:id",
  voucherController.updateVoucher
);

// ================= DELETE =================

router.delete(
  "/:id",
  voucherController.deleteVoucher
);

// ================= VALIDATE =================

router.post(
  "/validate",
  voucherController.validateVoucher
);

module.exports = router;