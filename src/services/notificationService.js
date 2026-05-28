const Notification =
  require("../models/notification");

const createNotification =
  async ({
    userId,
    title,
    message,
    type = "system",
  }) => {

    return await Notification.create({
      userId,
      title,
      message,
      type,
    });

  };

const getMyNotifications =
  async (userId) => {

    return await Notification.findAll({
      where: {
        userId,
      },

      order: [
        ["createdAt", "DESC"],
      ],
    });

  };

const markAsRead =
  async (id, userId) => {

    const notification =
      await Notification.findOne({
        where: {
          id,
          userId,
        },
      });

    if (!notification) {
      return null;
    }

    notification.isRead = true;

    await notification.save();

    return notification;

  };

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
};