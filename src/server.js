require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const { Op } = require("sequelize");

const app = require("./app");
const db = require("./models");

const sequelize = db.sequelize;
const { booking: Booking } = db;

const server = http.createServer(app);

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ================= ATTACH IO =================
app.set("io", io);

// inject io vào req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ================= SOCKET CONNECTION =================
io.on("connection", (socket) => {
  console.log("🔥 User connected:", socket.id);

  // ================= JOIN FIELD =================
  socket.on("join-field", (fieldId) => {
    if (!fieldId) return;

    // 🔥 dùng field- thay vì field_
    const room = `field-${fieldId}`;

    socket.join(room);

    console.log(
      `📌 ${socket.id} joined ${room}`
    );
  });

  // ================= LEAVE FIELD =================
  socket.on("leave-field", (fieldId) => {
    if (!fieldId) return;

    const room = `field-${fieldId}`;

    socket.leave(room);

    console.log(
      `❌ ${socket.id} left ${room}`
    );
  });

  // ================= HOLD SLOT =================
  socket.on("hold-slot", (data) => {
    if (!data?.field_id) return;

    console.log("🟠 HOLD SLOT:", data);

    io.to(`field-${data.field_id}`).emit(
      "slot-held",
      {
        field_id: data.field_id,

        booking_date:
            data.booking_date,

        start_time:
            data.start_time,

        // 🔥 QUAN TRỌNG
        userId: data.userId,
      }
    );
  });

  // ================= RELEASE SLOT =================
  socket.on("release-slot", (data) => {
    if (!data?.field_id) return;

    console.log(
      "⚪ RELEASE SLOT:",
      data
    );

    io.to(`field-${data.field_id}`).emit(
      "slot-released",
      {
        field_id: data.field_id,

        booking_date:
            data.booking_date,

        start_time:
            data.start_time,

        userId: data.userId,
      }
    );
  });

  // ================= BOOK SLOT =================
  socket.on("book-slot", (data) => {
    if (!data?.field_id) return;

    console.log("🔴 BOOK SLOT:", data);

    io.to(`field-${data.field_id}`).emit(
      "slot-booked",
      {
        field_id: data.field_id,

        booking_date:
            data.booking_date,

        start_time:
            data.start_time,

        userId: data.userId,
      }
    );
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log(
      "❌ User disconnected:",
      socket.id
    );
  });
});

// ================= AUTO RELEASE EXPIRED HOLD =================
setInterval(async () => {
  try {
    const now = new Date();

    const expired =
        await Booking.findAll({
      where: {
        status: "holding",

        hold_until: {
          [Op.lt]: now,
        },
      },
    });

    if (!expired.length) return;

    console.log(
      `⏰ Expired slots: ${expired.length}`
    );

    for (const b of expired) {
      io.to(`field-${b.fieldId}`).emit(
        "slot-released",
        {
          field_id: b.fieldId,

          start_time:
              b.start_time,

          end_time:
              b.end_time,

          // 🔥 QUAN TRỌNG
          userId: b.userId,
        }
      );
    }

    await Booking.destroy({
      where: {
        status: "holding",

        hold_until: {
          [Op.lt]: now,
        },
      },
    });

    console.log(
      "✅ Expired holds cleaned"
    );
  } catch (err) {
    console.error(
      "❌ Auto release error:",
      err
    );
  }
}, 5000);

// ================= START SERVER =================
const PORT =
    process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log(
      "✅ Database connected"
    );

    await sequelize.sync({
      alter: true,
    });

    console.log("🔥 DB synced");

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

startServer();