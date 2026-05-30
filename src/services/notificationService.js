const Notification =
  require("../models/notification");

// ================= CREATE =================

const createNotification =
  async ({
    userId,
    title,
    message,

    type = "system",

    icon = "notifications",

    route = null,

    referenceId = null,
  }) => {

    return await Notification.create({
      userId,
      title,
      message,

      type,

      icon,

      route,

      referenceId,
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

// ================= READ ALL =================

const markAllAsRead =
  async (userId) => {

    const result =
      await Notification.update(

        {
          isRead: true,
        },

        {
          where: {
            userId,
            isRead: false,
          },
        }
      );

    return result;
  };

// ================= DELETE =================

const deleteNotification =
  async (
    id,
    userId,
  ) => {

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

    await notification.destroy();

    return true;

  };

  // ================= DELETE ALL =================

const deleteAllNotifications =
  async (userId) => {

    const result =
      await Notification.destroy({

        where: {
          userId,
        },

      });

    return result;

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