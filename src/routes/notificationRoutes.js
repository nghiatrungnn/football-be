const router =
  require("express").Router();

const auth =
  require("../middlewares/authMiddleware");

const ctrl =
  require(
    "../controllers/notificationController"
  );

// ================= CREATE =================

router.post(
  "/",
  auth,
  ctrl.createNotification
);

// ================= GET ALL =================

router.get(
  "/",
  auth,
  ctrl.getAllNotifications
);

// ================= GET MY =================

router.get(
  "/my",
  auth,
  ctrl.getMyNotifications
);

// ================= GET BY ID =================

router.get(
  "/:id",
  auth,
  ctrl.getNotificationById
);

// ================= UPDATE =================

router.put(
  "/:id",
  auth,
  ctrl.updateNotification
);

// ================= READ =================

router.put(
  "/read/:id",
  auth,
  ctrl.markAsRead
);

// ================= DELETE =================

router.delete(
  "/:id",
  auth,
  ctrl.deleteNotification
);

module.exports =
  router;