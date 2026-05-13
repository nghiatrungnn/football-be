const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");

// ================= CONTROLLER =================
const ctrl = require("../controllers/bookingController");

// ================= SAFETY CHECK =================
if (typeof auth !== "function") {
  throw new Error("❌ auth middleware is not a function");
}

const requiredControllers = [
  "holdSlot",
  "cancelHold",
  "createBooking",
  "getByDate",
  "getMyBookings",
  "getAllBookings",
  "cancel",
];

requiredControllers.forEach((fn) => {
  if (typeof ctrl[fn] !== "function") {
    throw new Error(`❌ Controller missing or invalid: ${fn}`);
  }
});

// ================= ROUTES =================

// hold slot
router.post("/hold", auth, ctrl.holdSlot);

// cancel hold
router.post("/cancel-hold", auth, ctrl.cancelHold);

// create booking
router.post("/", auth, ctrl.createBooking);

// get bookings by date
router.get("/", auth, ctrl.getByDate);

// get my bookings
router.get("/my", auth, ctrl.getMyBookings);

// admin - get all bookings
router.get("/all", ctrl.getAllBookings);

// cancel booking
router.put("/:id/cancel", auth, ctrl.cancel);

module.exports = router;