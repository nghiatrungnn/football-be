const notificationService =
  require(
    "../services/notificationService"
  );


// =====================================================
// CREATE NOTIFICATION
// =====================================================
//
// Chức năng:
//
// Tạo thông báo mới.
//
// Đồng thời:
//
// - lưu database
// - gửi realtime bằng Socket.IO
//
// Hỗ trợ:
//
// - thông báo cá nhân
// - thông báo toàn hệ thống
//
const createNotification =

  async (

    req,

    res

  ) => {

    try {

      const {

        userId,

        title,

        message,

        type,

        isGlobal,

      } = req.body;


      // =====================================================
      // TẠO NOTIFICATION
      // =====================================================
      //
      const notification =

        await notificationService

          .createNotification({

            userId,

            title,

            message,

            type,

            isGlobal:

              isGlobal ||

              false,

          });


      // =====================================================
      // LẤY SOCKET.IO
      // =====================================================
      //
      const io =

        req.app.get(

          "io"

        );


      // =====================================================
      // THÔNG BÁO TOÀN HỆ THỐNG
      // =====================================================
      //
      if (

        isGlobal

      ) {

        io.emit(

          "new_notification",

          notification

        );

      }

      // =====================================================
      // THÔNG BÁO CÁ NHÂN
      // =====================================================
      //
      else {

        io.to(

          `user_${userId}`

        ).emit(

          "new_notification",

          notification

        );
      }


      // =====================================================
      // TRẢ KẾT QUẢ
      // =====================================================
      //
      res.status(201).json({

        success: true,

        notification,

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:

          error.message,

      });
    }
  };


// =====================================================
// GET ALL NOTIFICATIONS
// =====================================================
//
// Chức năng:
//
// Admin lấy toàn bộ thông báo.
//
const getAllNotifications =

  async (

    req,

    res

  ) => {

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

        message:

          error.message,

      });
    }
  };


// =====================================================
// GET MY NOTIFICATIONS
// =====================================================
//
// Chức năng:
//
// User lấy thông báo của mình.
//
const getMyNotifications =

  async (

    req,

    res

  ) => {

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

        message:

          error.message,

      });
    }
  };


// =====================================================
// GET NOTIFICATION DETAIL
// =====================================================
//
// Chức năng:
//
// Lấy chi tiết một thông báo.
//
const getNotificationById =

  async (

    req,

    res

  ) => {

    try {

      const notification =

        await notificationService

          .getNotificationById(

            req.params.id

          );


      // =====================================================
      // KHÔNG TÌM THẤY
      // =====================================================
      //
      if (

        !notification

      ) {

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

        message:

          error.message,

      });
    }
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

    req,

    res

  ) => {

    try {

      const notification =

        await notificationService

          .updateNotification(

            req.params.id,

            req.body

          );


      // =====================================================
      // KHÔNG TÌM THẤY
      // =====================================================
      //
      if (

        !notification

      ) {

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

        message:

          error.message,

      });
    }
  };


// =====================================================
// MARK AS READ
// =====================================================
//
// Chức năng:
//
// Đánh dấu một thông báo
// là đã đọc.
//
const markAsRead =

  async (

    req,

    res

  ) => {

    try {

      const result =

        await notificationService

          .markAsRead(

            req.params.id,

          );


      // =====================================================
      // KHÔNG TÌM THẤY
      // =====================================================
      //
      if (

        !result

      ) {

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

        message:

          error.message,

      });
    }
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

    req,

    res

  ) => {

    try {

      const result =

        await notificationService

          .markAllAsRead(

            req.user.id

          );


      res.json({

        success: true,

        updated:

          result,

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:

          error.message,

      });
    }
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

    req,

    res

  ) => {

    try {

      const result =

        await notificationService

          .deleteNotification(

            req.params.id,

          );


      // =====================================================
      // KHÔNG TÌM THẤY
      // =====================================================
      //
      // =====================================================
// KHÔNG TÌM THẤY
// =====================================================
if (

  result === null

) {

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

        message:

          error.message,

      });
    }
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

    req,

    res

  ) => {

    try {

      const result =

        await notificationService

          .deleteAllNotifications(

            req.user.id

          );


      res.json({

        success: true,

        deleted:

          result,

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:

          error.message,

      });
    }
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