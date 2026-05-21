 const router =
  require("express").Router();

const ctrl =
  require("../controllers/paymentController");

router.post(
  "/create",
  ctrl.createPayment
);

router.post(
  "/webhook",
  ctrl.paymentWebhook
);

module.exports = router;