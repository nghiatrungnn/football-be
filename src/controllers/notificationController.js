const notificationService =
  require(
    "../services/notificationService"
  );

// ================= CREATE =================

const createNotification =
  async (req, res) => {

    try {

      const {
        userId,
        title,
        message,  
        type,
        isGlobal,
      } = req.body;

      const notification =
        await notificationService
          .createNotification({

            userId,

            title,

            message,

            type,

            isGlobal:
              isGlobal || false,
          });

      const io =
        req.app.get("io");

      // ================= GLOBAL =================

      if (isGlobal) {

        io.emit(
          "new_notification",
          notification
        );

      } else {

        io.to(
          `user_${userId}`
        ).emit(
          "new_notification",
          notification
        );
      }

      res.status(201).json({
        success: true,
        notification,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// ================= GET ALL =================

const getAllNotifications =
  async (req, res) => {

    try {

      const notifications =
        await notificationService
          .getAllNotifications();

      res.json({
        success: true,
        notifications,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  };

// ================= GET MY =================

const getMyNotifications =
  async (req, res) => {

    try {

      const notifications =
        await notificationService
          .getMyNotifications(
            req.user.id
          );

      res.json({
        success: true,
        notifications,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  };

// ================= GET BY ID =================

const getNotificationById =
  async (req, res) => {

    try {

      const notification =
        await notificationService
          .getNotificationById(
            req.params.id
          );

      if (!notification) {

        return res.status(404)
          .json({
            success: false,
            message:
              "Notification not found",
          });

      }

      res.json({
        success: true,
        notification,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  };

// ================= UPDATE =================

const updateNotification =
  async (req, res) => {

    try {

      const notification =
        await notificationService
          .updateNotification(
            req.params.id,
            req.body
          );

      if (!notification) {

        return res.status(404)
          .json({
            success: false,
            message:
              "Notification not found",
          });

      }

      res.json({
        success: true,
        notification,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  };

// ================= READ =================

const markAsRead =
  async (req, res) => {

    try {

      const result =
        await notificationService
          .markAsRead(
            req.params.id,
          );

      if (!result) {

        return res.status(404)
          .json({
            success: false,
            message:
              "Notification not found",
          });

      }

      res.json({
        success: true,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };

// ================= READ ALL =================

const markAllAsRead =
  async (req, res) => {

    try {

      const result =
        await notificationService
          .markAllAsRead(
            req.user.id
          );

      res.json({
        success: true,
        updated: result,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  };  

// ================= DELETE =================

const deleteNotification =
  async (req, res) => {

    try {

      const result =
        await notificationService
  .deleteNotification(
    req.params.id,
  );
      if (!result) {

        return res.status(404)
          .json({
            success: false,
            message:
              "Notification not found",
          });

      }

      res.json({
        success: true,
        message:
          "Delete notification success",
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };

  // ================= DELETE ALL =================

const deleteAllNotifications =
  async (req, res) => {

    try {

      const result =
        await notificationService
          .deleteAllNotifications(
            req.user.id
          );

      res.json({
        success: true,
        deleted: result,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  };

module.exports = {
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getNotificationById,
  updateNotification,

  markAsRead,
  markAllAsRead,

  deleteNotification,
  deleteAllNotifications,
};