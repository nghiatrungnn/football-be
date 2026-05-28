const Notification =
  require("../models/notification");

// ================= CREATE =================

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

// ================= GET ALL =================

const getAllNotifications =
  async () => {

    return await Notification.findAll({

      order: [
        ["createdAt", "DESC"],
      ],

    });

  };

// ================= GET MY =================

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

// ================= GET BY ID =================

const getNotificationById =
  async (id) => {

    return await Notification.findByPk(
      id
    );

  };

// ================= UPDATE =================

const updateNotification =
  async (id, data) => {

    const notification =
      await Notification.findByPk(id);

    if (!notification) {
      return null;
    }

    await notification.update(data);

    return notification;

  };

// ================= READ =================

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

// ================= DELETE =================

const deleteNotification =
  async (id) => {

    const notification =
      await Notification.findByPk(id);

    if (!notification) {
      return null;
    }

    await notification.destroy();

    return true;

  };

module.exports = {
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getNotificationById,
  updateNotification,
  markAsRead,
  deleteNotification,
};