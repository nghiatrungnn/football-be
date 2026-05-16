const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");

// ================= CONTROLLER =================
const ctrl = require("../controllers/bookingController");

// ================= SAFETY CHECK =================
if (typeof auth !== "function") {
  throw new Error(
    "❌ auth middleware is not a function"
  );
}

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

// ================= ROUTES =================

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
  "/:id",
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

module.exports = router;