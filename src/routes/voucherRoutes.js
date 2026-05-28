const express =
  require("express");

const router =
  express.Router();

const voucherController =
  require(
    "../controllers/voucherController"
  );

// ================= GET =================

router.get(
  "/",
  voucherController.getVouchers,
);

// ================= VALIDATE =================

router.post(
  "/validate",
  voucherController.validateVoucher,
);

module.exports = router;