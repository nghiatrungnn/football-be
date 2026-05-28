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
  ctrl.createNotification
);

// ================= GET ALL =================

router.get(
  "/",
  ctrl.getAllNotifications
);

// ================= GET MY =================

router.get(
  "/my",
  ctrl.getMyNotifications
);

// ================= GET BY ID =================

router.get(
  "/:id",
  ctrl.getNotificationById
);

// ================= UPDATE =================

router.put(
  "/:id",
  ctrl.updateNotification
);

// ================= READ =================

router.put(
  "/read/:id",
  ctrl.markAsRead
);

// ================= DELETE =================

router.delete(
  "/:id",
  ctrl.deleteNotification
);

module.exports =
  router;