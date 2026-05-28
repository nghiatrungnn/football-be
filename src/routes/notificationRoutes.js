const router =
  require("express").Router();

const auth =
  require("../middlewares/authMiddleware");

const ctrl =
  require(
    "../controllers/notificationController"
  );

// ================= GET MY =================

router.get(
  "/my",
  auth,
  ctrl.getMyNotifications
);

// ================= READ =================

router.put(
  "/read/:id",
  auth,
  ctrl.markAsRead
);

module.exports =
  router;