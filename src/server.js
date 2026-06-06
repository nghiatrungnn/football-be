require("dotenv").config();

const http = require("http");

const { Server } = require("socket.io");

const { Op } = require("sequelize");

const app = require("./app");

const db = require("./models");

const sequelize =
  db.sequelize;

const Notification =
  require("./models/notification");

const {
  booking: Booking,
} = db;

// ================= SERVER =================
const server =
  http.createServer(app);

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: {
    origin: "*",

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],

    credentials: true,
  },
});

app.set("io", io);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// ================= HOLD CONFIG =================
const HOLD_MINUTES = 5;

// =====================================================
// SOCKET EVENTS
// =====================================================

io.on("connection", (socket) => {
  console.log(
    "🔥 User connected:",
    socket.id
  );

  // ================= JOIN USER =================
socket.on(
  "join_user",
  (userId) => {

    if (!userId) return;

    socket.join(
      `user_${userId}`
    );

    console.log(
      `👤 USER JOINED: user_${userId}`
    );

  }
);

  // ================= JOIN FIELD =================
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

  // ================= LEAVE FIELD =================
  socket.on(
    "leave_field",
    (fieldId) => {
      if (!fieldId) return;

      socket.leave(
        `field-${fieldId}`
      );
    }
  );

  // ================= HOLD SLOT =================
  socket.on(
    "hold_slot",
    async (data) => {
      try {
        if (!data?.field_id)
          return;

        const holdUntil =
          new Date(
            Date.now() +
              HOLD_MINUTES *
                60 *
                1000
          );

        // ================= REMOVE OLD HOLD =================
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

        // ================= CREATE HOLD =================
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

        // ================= REALTIME =================
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

  // ================= RELEASE SLOT =================
  socket.on(
    "release_slot",
    async (data) => {
      try {
        if (!data?.field_id)
          return;

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

  // ================= BOOK SLOT =================
  socket.on(
    "book_slot",
    async (data) => {
      try {
        if (!data?.field_id)
          return;

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

        // ================= REALTIME =================
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

  // ================= DISCONNECT =================
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

setInterval(async () => {
  try {
    const now =
      new Date();

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

    if (!expired.length)
      return;

    for (const b of expired) {

  b.status = "cancelled";

  b.payment_status =
    "expired";

  b.hold_until = null;

  await b.save();

      // ================= REALTIME =================
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

global.emitBookedSlot = (
  fieldId,
  startTime,
  bookingDate,
  userId
) => {
  io.to(
    `field-${fieldId}`
  ).emit("slot_update", {
    field_id: fieldId,

    booking_date:
      bookingDate,

    time: startTime,

    status: "booked",

    userId,
  });
};

global.emitHoldingSlot = (
  fieldId,
  startTime,
  bookingDate,
  userId
) => {
  io.to(
    `field-${fieldId}`
  ).emit("slot_update", {
    field_id: fieldId,

    booking_date:
      bookingDate,

    time: startTime,

    status: "holding",

    userId,
  });
};

global.emitAvailableSlot = (
  fieldId,
  startTime,
  bookingDate,
  userId
) => {
  io.to(
    `field-${fieldId}`
  ).emit("slot_update", {
    field_id: fieldId,

    booking_date:
      bookingDate,

    time: startTime,

    status:
      "available",

    userId,
  });
};

// =====================================================
// USER NOTIFICATION
// =====================================================

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
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

async function startServer() {
  try {
    // ================= DB =================
    await sequelize.authenticate();

    console.log(
      "✅ Database connected"
    );

    // ================= SYNC =================
    await sequelize.sync({
      alter: true,
    });

    console.log(
      "🔥 DB synced"
    );

    // ================= SERVER =================
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