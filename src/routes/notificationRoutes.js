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

// ================= READ ALL =================

router.put(
  "/read-all",
  auth,
  ctrl.markAllAsRead
);

// ================= READ =================

router.put(
  "/read/:id",
  auth,
  ctrl.markAsRead
);

// ================= DELETE ALL =================

router.delete(
  "/delete-all",
  auth,
  ctrl.deleteAllNotifications
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

// ================= DELETE =================

router.delete(
  "/:id",
  auth,
  ctrl.deleteNotification
);

module.exports =
  router;