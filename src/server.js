// ======================================================
// Đọc biến môi trường từ file .env
// Ví dụ:
// PORT=5000
// DB_HOST=localhost
// ======================================================
require("dotenv").config();

// ======================================================
// IMPORT THƯ VIỆN
// ======================================================

// Tạo HTTP Server
const http = require("http");

// SocketIO dùng cho realtime
const { Server } = require("socket.io");

// Sequelize Operators
const { Op } = require("sequelize");

// Express App
const app = require("./app");

// Toàn bộ Models
const db = require("./models");

// ======================================================
// MODELS
// ======================================================

// Instance sequelize chính
const sequelize = db.sequelize;

// Model Notification
const Notification =
  require("./models/notification");

// Model Booking
const {
  booking: Booking,
} = db;

// ======================================================
// TẠO HTTP SERVER
// ======================================================
//
// Express sẽ chạy bên trong server này
//
const server =
  http.createServer(app);

// ======================================================
// KHỞI TẠO SOCKET.IO
// ======================================================
//
// Cho phép Flutter, Web, Mobile
// kết nối realtime tới backend
//
const io = new Server(server, {
  cors: {

    // Cho phép mọi domain kết nối
    origin: "*",

    // Các phương thức HTTP được phép
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],

    // Cho phép credentials
    credentials: true,
  },
});

// ======================================================
// Đưa io vào app
// Để có thể:
// req.app.get("io")
// ======================================================
app.set("io", io);

// ======================================================
// Middleware gắn io vào request
//
// Sau đó trong controller:
//
// req.io.emit(...)
// ======================================================
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ======================================================
// CẤU HÌNH GIỮ SLOT
// ======================================================
//
// Khi người dùng chọn giờ
// hệ thống giữ trong 5 phút
//
// Nếu không thanh toán
// sẽ tự động huỷ
//
const HOLD_MINUTES = 5;

// ======================================================
// SOCKET EVENTS
// ======================================================
io.on("connection", (socket) => {

  console.log(
    "🔥 User connected:",
    socket.id
  );

  // ==================================================
  // JOIN USER ROOM
  // ==================================================
  //
  // Mỗi user có 1 room riêng
  //
  // user_1
  // user_2
  // user_3
  //
  // Dùng để gửi notification realtime
  //
  socket.on(
    "join_user",
    (userId) => {

      // Không có userId thì bỏ qua
      if (!userId) return;

      // Join room user
      socket.join(
        `user_${userId}`
      );

      console.log(
        `👤 USER JOINED: user_${userId}`
      );
    }
  );

  // ==================================================
  // JOIN FIELD ROOM
  // ==================================================
  //
  // Khi mở màn hình chi tiết sân
  //
  // field-1
  // field-2
  // field-3
  //
  // Sau đó mọi thay đổi slot
  // sẽ realtime tới room này
  //
  socket.on(
    "join_field",
    (fieldId) => {

      if (!fieldId) return;

      socket.join(
        `field-${fieldId}`
      );

      console.log(
        `📡 JOIN field-${fieldId}`
      );
    }
  );

  // ==================================================
  // LEAVE FIELD ROOM
  // ==================================================
  //
  // Khi thoát màn hình chi tiết sân
  //
  // Ngừng nhận realtime
  //
  socket.on(
    "leave_field",
    (fieldId) => {

      if (!fieldId) return;

      socket.leave(
        `field-${fieldId}`
      );
    }
  );

  // ==================================================
  // HOLD SLOT
  // ==================================================
  //
  // Người dùng chọn khung giờ
  //
  // 1. Tạo booking holding
  // 2. Giữ 5 phút
  // 3. Realtime cho mọi người
  //
  socket.on(
    "hold_slot",
    async (data) => {

      try {

        // Không có sân
        if (!data?.field_id)
          return;

        // ==========================================
        // Tính thời gian hết hạn hold
        // ==========================================
        const holdUntil =
          new Date(
            Date.now() +
              HOLD_MINUTES *
                60 *
                1000
          );

        // ==========================================
        // Xoá hold cũ cùng khung giờ
        // Tránh trùng dữ liệu
        // ==========================================
        await Booking.destroy({
          where: {
            fieldId:
              data.field_id,

            start_time:
              data.start_time,

            status:
              "holding",
          },
        });

        // ==========================================
        // Tạo booking holding mới
        // ==========================================
        await Booking.create({

          fieldId:
            data.field_id,

          userId:
            data.userId,

          booking_date:
            data.booking_date,

          start_time:
            data.start_time,

          end_time:
            data.end_time,

          status:
            "holding",

          payment_status:
            "pending",

          hold_until:
            holdUntil,
        });
                // ==========================================
        // REALTIME UPDATE
        // ==========================================
        //
        // Thông báo cho toàn bộ client
        // đang xem sân này biết rằng:
        //
        // Slot đã được giữ
        //
        io.to(
          `field-${data.field_id}`
        ).emit(
          "slot_update",
          {
            field_id:
              data.field_id,

            booking_date:
              data.booking_date,

            time:
              data.start_time,

            status:
              "holding",

            userId:
              data.userId,

            hold_until:
              holdUntil,
          }
        );

        console.log(
          "🟠 HOLD SLOT:",
          data.start_time
        );

      } catch (err) {

        console.error(
          "❌ HOLD SLOT ERROR:",
          err
        );

      }
    }
  );

  // ==================================================
  // RELEASE SLOT
  // ==================================================
  //
  // Người dùng bỏ chọn giờ
  //
  // Xoá trạng thái holding
  // và trả slot về available
  //
  socket.on(
    "release_slot",
    async (data) => {

      try {

        if (!data?.field_id)
          return;

        // ==========================================
        // Xoá booking holding
        // ==========================================
        await Booking.destroy({
          where: {

            fieldId:
              data.field_id,

            start_time:
              data.start_time,

            status:
              "holding",
          },
        });

        // ==========================================
        // Realtime trạng thái available
        // ==========================================
        io.to(
          `field-${data.field_id}`
        ).emit(
          "slot_update",
          {

            field_id:
              data.field_id,

            booking_date:
              data.booking_date,

            time:
              data.start_time,

            status:
              "available",

            userId:
              data.userId,
          }
        );

        console.log(
          "⚪ RELEASE SLOT:",
          data.start_time
        );

      } catch (err) {

        console.error(
          "❌ RELEASE SLOT ERROR:",
          err
        );

      }
    }
  );

  // ==================================================
  // BOOK SLOT
  // ==================================================
  //
  // Được gọi sau khi:
  //
  // Thanh toán thành công
  //
  // holding -> booked
  //
  socket.on(
    "book_slot",
    async (data) => {

      try {

        if (!data?.field_id)
          return;

        // ==========================================
        // Chuyển booking từ holding
        // sang booked
        // ==========================================
        await Booking.update(
          {

            status:
              "booked",

            payment_status:
              "paid",

            hold_until:
              null,
          },

          {
            where: {

              fieldId:
                data.field_id,

              start_time:
                data.start_time,

              status:
                "holding",

              userId:
                data.userId,
            },
          }
        );

        // ==========================================
        // Realtime trạng thái booked
        // ==========================================
        io.to(
          `field-${data.field_id}`
        ).emit(
          "slot_update",
          {

            field_id:
              data.field_id,

            booking_date:
              data.booking_date,

            time:
              data.start_time,

            status:
              "booked",

            userId:
              data.userId,
          }
        );

        console.log(
          "🔴 BOOKED:",
          data.start_time
        );

      } catch (err) {

        console.error(
          "❌ BOOK SLOT ERROR:",
          err
        );

      }
    }
  );

  // ==================================================
  // DISCONNECT
  // ==================================================
  //
  // Người dùng ngắt kết nối socket
  //
  socket.on(
    "disconnect",
    () => {

      console.log(
        "❌ User disconnected:",
        socket.id
      );

    }
  );
});

// =====================================================
// AUTO EXPIRE HOLD
// =====================================================
//
// Chạy mỗi 5 giây
//
// Nhiệm vụ:
//
// Tìm các booking holding
// đã hết hạn
//
// holding -> cancelled
//
// Đồng thời realtime
// trả slot về available
//
setInterval(async () => {

  try {

    const now =
      new Date();

    // ==============================================
    // Lấy danh sách booking holding hết hạn
    // ==============================================
    const expired =
      await Booking.findAll({
        where: {

          status:
            "holding",

          hold_until: {
            [Op.lt]: now,
          },
        },
      });

    // Không có booking hết hạn
    if (!expired.length)
      return;

    // ==============================================
    // Xử lý từng booking
    // ==============================================
    for (const b of expired) {

      // Chuyển trạng thái
      b.status =
        "cancelled";

      b.payment_status =
        "expired";

      b.hold_until =
        null;

      await b.save();

      // ==========================================
      // Realtime trả slot về available
      // ==========================================
      io.to(
        `field-${b.fieldId}`
      ).emit(
        "slot_update",
        {

          field_id:
            b.fieldId,

          booking_date:
            b.booking_date,

          time:
            b.start_time,

          status:
            "available",

          userId:
            b.userId,
        }
      );

      console.log(
        "⏰ AUTO RELEASE:",
        b.start_time
      );
    }

  } catch (err) {

    console.error(
      "❌ AUTO EXPIRE ERROR:",
      err
    );

  }

}, 5000);

// =====================================================
// GLOBAL REALTIME HELPERS
// =====================================================
//
// Các hàm global để controller
// hoặc service có thể gọi trực tiếp
//
// global.emitBookedSlot(...)
// global.emitHoldingSlot(...)
// global.emitAvailableSlot(...)
//

// Emit trạng thái booked
global.emitBookedSlot = (
  fieldId,
  startTime,
  bookingDate,
  userId
) => {

  io.to(
    `field-${fieldId}`
  ).emit(
    "slot_update",
    {

      field_id:
        fieldId,

      booking_date:
        bookingDate,

      time:
        startTime,

      status:
        "booked",

      userId,
    }
  );
};

// Emit trạng thái holding
global.emitHoldingSlot = (
  fieldId,
  startTime,
  bookingDate,
  userId
) => {

  io.to(
    `field-${fieldId}`
  ).emit(
    "slot_update",
    {

      field_id:
        fieldId,

      booking_date:
        bookingDate,

      time:
        startTime,

      status:
        "holding",

      userId,
    }
  );
};

// Emit trạng thái available
global.emitAvailableSlot = (
  fieldId,
  startTime,
  bookingDate,
  userId
) => {

  io.to(
    `field-${fieldId}`
  ).emit(
    "slot_update",
    {

      field_id:
        fieldId,

      booking_date:
        bookingDate,

      time:
        startTime,

      status:
        "available",

      userId,
    }
  );
};

// =====================================================
// USER NOTIFICATION
// =====================================================
//
// Gửi thông báo realtime
// tới đúng user
//
// Ví dụ:
//
// emitNotification(
//   5,
//   notification
// )
//
// -> user_5 nhận được
//
global.emitNotification = (
  userId,
  notification,
) => {

  io.to(
    `user_${userId}`
  ).emit(
    "new_notification",
    notification,
  );

  console.log(
    `🔔 SEND NOTIFICATION TO user_${userId}`
  );
};

// =====================================================
// KHỞI ĐỘNG SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

// =====================================================
// START SERVER
// =====================================================
//
// 1. Kết nối Database
// 2. Sync Model
// 3. Mở Server
//
async function startServer() {

  try {

    // ==========================================
    // Kiểm tra kết nối DB
    // ==========================================
    await sequelize.authenticate();

    console.log(
      "✅ Database connected"
    );

    // ==========================================
    // Đồng bộ model
    // ==========================================
    // await sequelize.sync({
    //   alter: true,
    // });
    await sequelize.sync();

    console.log(
      "🔥 DB synced"
    );

    // ==========================================
    // Khởi động server
    // ==========================================
    server.listen(PORT, () => {

      console.log(
        `🚀 Server running on port ${PORT}`
      );

    });

  } catch (err) {

    console.error(
      "❌ Server start error:",
      err
    );

    process.exit(1);
  }
}

// =====================================================
// CHẠY SERVER
// =====================================================
startServer();