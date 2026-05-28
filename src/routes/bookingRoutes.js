const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");

// ================= CONTROLLERS =================
const ctrl =
  require("../controllers/bookingController");

const paymentCtrl =
  require("../controllers/paymentController");

// ================= SAFETY CHECK =================
if (typeof auth !== "function") {
  throw new Error(
    "❌ auth middleware is not a function"
  );
}

// ================= CHECK BOOKING CONTROLLERS =================
const requiredControllers = [
  "holdSlot",
  "cancelHold",
  "createBooking",
  "updateBooking",
  "deleteBooking",
  "getByDate",
  "getMyBookings",
  "getAllBookings",
  "cancel",
];

requiredControllers.forEach((fn) => {
  if (typeof ctrl[fn] !== "function") {
    throw new Error(
      `❌ Controller missing or invalid: ${fn}`
    );
  }
});

// ================= CHECK PAYMENT CONTROLLERS =================
const requiredPaymentControllers = [
  "createPayment",
  "paymentWebhook",
];

requiredPaymentControllers.forEach((fn) => {
  if (
    typeof paymentCtrl[fn] !==
    "function"
  ) {
    throw new Error(
      `❌ Payment controller missing: ${fn}`
    );
  }
});

// =====================================================
// BOOKING ROUTES
// =====================================================

// ================= HOLD SLOT =================
router.post(
  "/hold",
  auth,
  ctrl.holdSlot
);

// ================= CANCEL HOLD =================
router.post(
  "/cancel-hold",
  auth,
  ctrl.cancelHold
);

// ================= CREATE BOOKING =================
router.post(
  "/",
  auth,
  ctrl.createBooking
);

// ================= UPDATE BOOKING =================
router.put(
  "/:id",
  auth,
  ctrl.updateBooking
);

// ================= DELETE BOOKING =================
router.delete(
  "/delete/:id",
  auth,
  ctrl.deleteBooking
);

// ================= GET BOOKINGS BY DATE =================
router.get(
  "/",
  ctrl.getByDate
);

// ================= GET MY BOOKINGS =================
router.get(
  "/my",
  auth,
  ctrl.getMyBookings
);

// ================= GET ALL BOOKINGS =================
router.get(
  "/all",
  ctrl.getAllBookings
);

// ================= CANCEL BOOKING =================
router.put(
  "/:id/cancel",
  auth,
  ctrl.cancel
);

// =====================================================
// PAYOS PAYMENT ROUTES
// =====================================================

// ================= CREATE PAYMENT QR =================
router.post(
  "/payment/create",
  auth,
  paymentCtrl.createPayment
);

// ================= PAYOS WEBHOOK =================
router.post(
  "/payment/webhook",
  paymentCtrl.paymentWebhook
);

// ================= CANCEL BOOKING =================
router.post(
  "/cancel/:id",
  auth,
  ctrl.cancel
);

// ================= REFUND BOOKING =================
router.post(
  "/refund/:id",
  auth,
  ctrl.refundBooking
);
module.exports = router;