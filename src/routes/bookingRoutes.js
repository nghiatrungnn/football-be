const router = require("express").Router();
const auth = require("../middlewares/auth");
const ctrl = require("../controllers/bookingController");

// ================= CREATE BOOKING =================
// 🔥 cho phép cả user + khách
router.post("/", ctrl.createBooking);

// ================= GET BOOKINGS BY DATE =================
router.get("/", ctrl.getByDate);

// ================= GET MY BOOKINGS =================
router.get("/my", auth, ctrl.getMyBookings);

// ================= CANCEL =================
router.put("/:id/cancel", auth, ctrl.cancel);

module.exports = router;