const notificationService =
  require(
    "../services/notificationService"
  );

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

const markAsRead =
  async (req, res) => {

    try {

      const result =
        await notificationService
          .markAsRead(
            req.params.id,
            req.user.id
          );

      if (!result) {
        return res.status(404).json({
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

module.exports = {
  getMyNotifications,
  markAsRead,
};