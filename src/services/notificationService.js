const Notification =
  require("../models/notification");

const { Op } =
  require("sequelize");


// =====================================================
// CREATE NOTIFICATION
// =====================================================
//
// Chức năng:
//
// Tạo thông báo mới.
//
// Dùng khi:
//
// - Đặt sân thành công
// - Hủy sân
// - Thanh toán thành công
// - Thông báo hệ thống
//
const createNotification =

  async ({

    userId,

    title,

    message,

    type = "system",

    icon = "notifications",

    route = null,

    referenceId = null,

    isRead = false,

    isGlobal = false,

  }) => {

    // =====================================================
    // TẠO THÔNG BÁO
    // =====================================================
    //
    const notification =

      await Notification.create({

        userId,

        title,

        message,

        type,

        icon,

        route,

        referenceId,

        isRead,

        isGlobal,

      });


    return notification;
  };


// =====================================================
// GET ALL NOTIFICATIONS
// =====================================================
//
// Chức năng:
//
// Lấy toàn bộ thông báo.
//
// Thường dùng cho Admin.
//
const getAllNotifications =

  async () => {

    return await Notification.findAll({

      order: [

        [

          "createdAt",

          "DESC",

        ],

      ],

    });
  };


// =====================================================
// GET MY NOTIFICATIONS
// =====================================================
//
// Chức năng:
//
// Lấy thông báo của user.
//
// Bao gồm:
//
// - thông báo riêng
// - thông báo toàn hệ thống
//
const getMyNotifications =

  async (

    userId

  ) => {

    return await Notification.findAll({

      where: {

        [Op.or]: [

          {
            userId,
          },

          {
            isGlobal: true,
          },

        ],

      },

      order: [

        [

          "createdAt",

          "DESC",

        ],

      ],

    });
  };


// =====================================================
// GET NOTIFICATION BY ID
// =====================================================
//
// Chức năng:
//
// Lấy chi tiết một thông báo.
//
const getNotificationById =

  async (

    id

  ) => {

    return await Notification.findByPk(

      id

    );
  };


// =====================================================
// UPDATE NOTIFICATION
// =====================================================
//
// Chức năng:
//
// Cập nhật thông báo.
//
const updateNotification =

  async (

    id,

    data

  ) => {

    const notification =

      await Notification.findByPk(

        id

      );


    // =====================================================
    // KHÔNG TÌM THẤY
    // =====================================================
    //
    if (

      !notification

    ) {

      return null;
    }


    // =====================================================
    // UPDATE
    // =====================================================
    //
    await notification.update(

      data

    );


    return notification;
  };


// =====================================================
// MARK AS READ
// =====================================================
//
// Chức năng:
//
// Đánh dấu đã đọc
// cho một thông báo.
//
const markAsRead =

  async (

    id

  ) => {

    const notification =

      await Notification.findOne({

        where: {

          id,

        },

      });


    // =====================================================
    // KHÔNG TÌM THẤY
    // =====================================================
    //
    if (

      !notification

    ) {

      return null;
    }


    // =====================================================
    // ĐÁNH DẤU ĐÃ ĐỌC
    // =====================================================
    //
    notification.isRead =

      true;


    await notification.save();


    return notification;
  };


// =====================================================
// MARK ALL AS READ
// =====================================================
//
// Chức năng:
//
// Đánh dấu tất cả thông báo
// của user là đã đọc.
//
const markAllAsRead =

  async (

    userId

  ) => {

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


// =====================================================
// DELETE NOTIFICATION
// =====================================================
//
// Chức năng:
//
// Xóa một thông báo.
//
const deleteNotification =

  async (

    id,

  ) => {

    const notification =

      await Notification.findOne({

        where: {

          id,

        },

      });


    // =====================================================
    // KHÔNG TÌM THẤY
    // =====================================================
    //
    if (

      !notification

    ) {

      return null;
    }


    // =====================================================
    // XÓA
    // =====================================================
    //
    await notification.destroy();


    return true;
  };


// =====================================================
// DELETE ALL NOTIFICATIONS
// =====================================================
//
// Chức năng:
//
// Xóa toàn bộ thông báo
// của user.
//
const deleteAllNotifications =

  async (

    userId

  ) => {

    const result =

      await Notification.destroy({

        where: {

          userId,

        },

      });


    return result;
  };


// =====================================================
// EXPORT
// =====================================================

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