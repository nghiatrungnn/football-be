const {
  booking: Booking,
  field: Field,
  user: User,
  sequelize,
} = require("../models");

const { Op } = require("sequelize");

// ================= GET IO =================
const getIO = (req) => req.app.get("io");

// ================= FORMAT TIME VN =================
const formatVNTime = (time) => {

  if (!time) return null;

  return time
    .toString()
    .slice(0, 5);
};

// ================= FORMAT DATE =================
const formatDateOnly = (date) => {
  return new Date(date)
    .toISOString()
    .split("T")[0];
};

// ================= FORMAT BOOKING RESPONSE =================
const formatBookingResponse = (
  booking
) => {

  // ================= OCCUPIED SLOTS =================

  const occupied_slots = [];

const [sh, sm] =
  booking.start_time
    .split(":")
    .map(Number);

const [eh, em] =
  booking.end_time
    .split(":")
    .map(Number);

let current =
  sh * 60 + sm;

const end =
  eh * 60 + em;

while (current < end) {

  const h =
    Math.floor(current / 60);

  const m =
    current % 60;

  occupied_slots.push(
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  );

  current += 30;
}


  return {
    ...booking.toJSON(),

    booking_date:
        formatDateOnly(
            booking.booking_date
        ),

    start_time:
        formatVNTime(
            booking.start_time
        ),

    end_time:
        formatVNTime(
            booking.end_time
        ),

    occupied_slots,
  };

};

// ================= EMIT REALTIME =================
const emitSlotUpdate = ({
  io,
  fieldId,
  bookingDate,
  startTime,
  status,
  userId = null,
  holdUntil = null,
}) => {
  io.to(`field-${fieldId}`).emit(
    "slot_update",
    {
      field_id: fieldId,
      booking_date: bookingDate,
      time: startTime,
      status,
      userId,
      hold_until: holdUntil,
    }
  );

  console.log(
    `📡 SLOT UPDATE => ${status} | field-${fieldId}`
  );
};

// ================= CLEAN EXPIRED HOLDS =================
const cleanExpiredHold = async (
  io = null
) => {
  try {

    const expired =
        await Booking.findAll({
      where: {

        status: "holding",

        hold_until: {
          [Op.lt]:
          new Date(),
        },
      },
    });

    for (const b of expired) {

      if (io) {

        emitSlotUpdate({
          io,

          fieldId:
          b.fieldId,

          bookingDate:
          b.booking_date,

          startTime:
          b.start_time,

          status:
          "cancelled",
        });
      }

      await b.destroy();
    }

    if (
    expired.length > 0
    ) {

      console.log(
          `⏰ Cleaned ${expired.length} expired holds`
      );
    }

  } catch (err) {

    console.error(
        "❌ cleanExpiredHold error:",
        err
    );
  }
};

// ================= CLEAN EXPIRED BOOKINGS =================
const cleanExpiredBookings =
  async (io = null) => {
    try {
      const now = new Date();

      const expiredBookings =
        await Booking.findAll({
          where: {
            status: {
  [Op.in]: [
    "booked",
    "paid",
  ],
},

end_time: {
  [Op.lt]: now,
},
          },
        });

      for (const b of expiredBookings) {
        b.status = "completed";

        await b.save();

        if (io) {
          emitSlotUpdate({
            io,
            fieldId: b.fieldId,
            bookingDate:
              b.booking_date,
            startTime:
              b.start_time,
            status:
            "completed",
          });
        }
      }

      if (
        expiredBookings.length > 0
      ) {
        console.log(
          `✅ Cleared ${expiredBookings.length} expired bookings`
        );
      }
    } catch (err) {
      console.error(
        "❌ cleanExpiredBookings error:",
        err
      );
    }
  };

// ================= HOLD SLOT =================
const holdSlot = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const io = getIO(req);

    await cleanExpiredHold(io);

    const {
      field_id,
      booking_date,
      start_time,
    } = req.body;

    if (
      !field_id ||
      !booking_date ||
      !start_time
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const fixedTime =
  start_time.toString().length === 5
    ? `${start_time}:00`
    : start_time.toString();

    const startDateTime = fixedTime;

    const duration =
  Number(
    req.body.duration || 60
  );

const [h, m, s] =
  fixedTime.split(":").map(Number);

const end = new Date(
  2025,
  1,
  1,
  h,
  m + duration,
  s || 0
);

const endDateTime =
  `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}:00`;

    // ================= CHECK CONFLICT =================
    const conflict =
await Booking.findOne({

  where: {

    fieldId: field_id,

    booking_date,

    status: {
      [Op.in]: [
        "holding",
        "booked",
      ],
    },

    [Op.and]: [

      sequelize.where(
        sequelize.col("start_time"),
        "<",
        endDateTime
      ),

      sequelize.where(
        sequelize.col("end_time"),
        ">",
        startDateTime
      ),
    ],
  },

  transaction,
});

    if (conflict) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Slot already taken",
      });
    }

    // ================= HOLD 5 MIN =================
    const holdUntil =
      new Date(
        Date.now() +
          5 * 60 * 1000
      );

    // ================= CREATE HOLD =================
    const booking =
      await Booking.create(
        {
          userId: req.user.id,

          fieldId: field_id,

          booking_date,

          start_time:
            startDateTime,

          end_time:
            endDateTime,

          status: "holding",

          hold_until:
            holdUntil,

          total_price: 0,

          payment_method:
            "cash",

          payment_status:
            "pending",
        },

        {
          transaction,
        }
      );

    await transaction.commit();

    let emitTime = new Date(
  booking.start_time
);

while (
  emitTime < booking.end_time
) {

  emitSlotUpdate({
    io,

    fieldId: field_id,

    bookingDate:
      booking_date,

    startTime:
      emitTime,

    status: "holding",

    userId:
      req.user.id,

    holdUntil,
  });

  emitTime = new Date(
    emitTime.getTime() +
      30 * 60 * 1000
  );
}

    return res.json({
      success: true,

      booking:
        formatBookingResponse(
          booking
        ),

      hold_until: holdUntil,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}

    console.error(
      "❌ holdSlot error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= CANCEL HOLD =================
const cancelHold = async (
  req,
  res
) => {
  try {
    const io = getIO(req);

    const {
      field_id,
      booking_date,
      start_time,
    } = req.body;

    const fixedTime =
    start_time.toString().length === 5
        ? `${start_time}:00`
        : start_time.toString();

    const startDateTime = fixedTime;

console.log(
  "START =>",
  startDateTime
);

    const booking =
await Booking.findOne({

  where: {

    userId: req.user.id,

    fieldId: field_id,

    status: "holding",

    hold_until: {
      [Op.gt]: new Date(),
    },

    [Op.and]: [

      sequelize.where(
        sequelize.col("start_time"),
        "<=",
        startDateTime
      ),

      sequelize.where(
        sequelize.col("end_time"),
        ">",
        startDateTime
      ),
    ],
  },
});

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Holding slot not found",
      });
    }

    await booking.destroy();
    await cleanExpiredHold(io);

    emitSlotUpdate({
      io,
      fieldId: field_id,
      bookingDate:
        booking_date,
      startTime:
        startDateTime,
      status: "cancelled",
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message:
        "Hold cancelled successfully",
    });
  } catch (err) {
    console.error(
      "❌ cancelHold error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= CREATE BOOKING =================
const createBooking = async (
  req,
  res
) => {

  const transaction =
      await sequelize.transaction();

  try {

    const io = getIO(req);

    const {
      field_id,
      booking_date,

      slots,

      duration,

      name,
      phone,
      email,

      payment_method,
      transaction_code,
      payment_note,
    } = req.body;

    if (
        !field_id ||
        !booking_date ||
        !slots ||
        !Array.isArray(slots) ||
        slots.length === 0
    ) {

      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const bookings = [];

    for (const slot of slots) {

      const fixedTime =
    slot.toString().length === 5
        ? `${slot}:00`
        : slot.toString();

      const startDateTime = fixedTime;

      const [h, m, s] =
  fixedTime.split(":").map(Number);

const end = new Date(
  2025,
  1,
  1,
  h,
  m + duration,
  s || 0
);

const endDateTime =
  `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}:00`;

      // ================= FIND HOLD =================

      const booking =
          await Booking.findOne({

            where: {

              userId:
              req.user.id,

              fieldId:
              field_id,

              start_time:
              startDateTime,

              status:
              "holding",

              hold_until: {
                [Op.gt]:
                new Date(),
              },
            },

            transaction,

          });

      if (!booking) {

        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message:
          `Slot ${slot} not held`,
        });
      }

// =====================================================
// CASH
// =====================================================

if (payment_method === "cash") {

  // Chưa thanh toán => chỉ giữ sân
  booking.status = "holding";

  booking.payment_status = "pending";

  booking.hold_until =
      new Date(
          Date.now() +
          5 * 60 * 1000
      );
}

// =====================================================
// TRANSFER / PAYOS
// =====================================================

else {

  // Chờ PayOS xác nhận
  booking.status = "holding";

  booking.payment_status = "pending";

  booking.hold_until =
      new Date(
          Date.now() +
          10 * 60 * 1000
      );
}
      // =====================================================
      // INFO
      // =====================================================

      booking.name = name;

      booking.phone = phone;

      booking.email = email;

      booking.payment_method =
          payment_method ||
          "cash";

      booking.transaction_code =
          transaction_code ||
          null;

      booking.payment_note =
          payment_note ||
          null;

      await booking.save({
        transaction,
      });

      bookings.push(booking);

      let emitTime = new Date(
  booking.start_time
);

while (
  emitTime < booking.end_time
) {

  emitSlotUpdate({
    io,

    fieldId: field_id,

    bookingDate:
      booking_date,

    startTime:
      emitTime,

   status: "holding",

    userId:
      req.user.id,

    holdUntil:
      booking.hold_until,
  });

  emitTime = new Date(
    emitTime.getTime() +
      30 * 60 * 1000
  );
}
    }

    await transaction.commit();

    return res.json({

      success: true,

      message:
      "Booking created successfully",

      booking:
      formatBookingResponse(
          bookings[0]
      ),

      bookings:
      bookings.map((b) =>
          formatBookingResponse(
              b
          )
      ),
    });

  } catch (err) {

    try {
      await transaction.rollback();
    } catch (_) {}

    console.error(
        "❌ createBooking error:",
        err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= UPDATE BOOKING =================
const updateBooking = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    await booking.update(
      req.body
    );

    return res.json({
      success: true,
      message:
        "Booking updated successfully",

      booking:
        formatBookingResponse(
          booking
        ),
    });
  } catch (err) {
    console.error(
      "❌ updateBooking error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= DELETE BOOKING =================
const deleteBooking = async (
  req,
  res
) => {
  try {

    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    // ================= DELETE REAL =================

    await booking.destroy();

    return res.json({
      success: true,
      message:
        "Booking deleted successfully",
    });

  } catch (err) {

    console.error(
      "❌ deleteBooking error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET BOOKINGS BY DATE =================
const getByDate = async (
  req,
  res
) => {
  try {

    const io = getIO(req);

    await cleanExpiredHold(io);

    await cleanExpiredBookings(io);

    const {
      field_id,
      booking_date,
    } = req.query;

    const whereClause = {};

    if (field_id) {
      whereClause.fieldId =
        field_id;
    }

    if (booking_date) {
      whereClause.booking_date =
        booking_date;
    }

    const bookings =
      await Booking.findAll({
        where: whereClause,

        include: [
          {
            model: User,
            attributes: [
              "id",
              "name",
            ],
          },
          {
            model: Field,
          },
        ],

        order: [
          [
            "start_time",
            "ASC",
          ],
        ],
      });

      return res.json({
        success: true,

        bookings:
          bookings.map((b) =>
            formatBookingResponse(b)
          ),
      });
  } catch (err) {
    console.error(
      "❌ getByDate error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET MY BOOKINGS =================
const getMyBookings =
  async (req, res) => {
    try {
      const bookings =
        await Booking.findAll({
          where: {
            userId:
              req.user.id,
          },

          include: [
            {
              model: Field,
            },
          ],

          order: [
            [
              "createdAt",
              "DESC",
            ],
          ],
        });

      return res.json({
        success: true,

        bookings:
          bookings.map((b) =>
            formatBookingResponse(b)
          ),
      });
    } catch (err) {
      console.error(
        "❌ getMyBookings error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ================= GET ALL BOOKINGS =================
const getAllBookings =
  async (req, res) => {
    try {
      const bookings =
        await Booking.findAll({
          include: [
            {
              model: Field,
            },
            {
              model: User,
              attributes: [
                "id",
                "name",
                "email",
              ],
            },
          ],

          order: [
            [
              "createdAt",
              "DESC",
            ],
          ],
        });

      return res.json({
        success: true,

        bookings:
          bookings.map((b) =>
            formatBookingResponse(b)
          ),
      });
    } catch (err) {
      console.error(
        "❌ getAllBookings error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ================= CANCEL =================
const cancel = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    booking.status =
      "cancelled";

    booking.hold_until =
      null;

    await booking.save();

    return res.json({
      success: true,
      message:
        "Booking cancelled",
    });
  } catch (err) {
    console.error(
      "❌ cancel booking error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= EXPORTS =================
module.exports = {
  holdSlot,
  cancelHold,
  createBooking,
  updateBooking,
  deleteBooking,
  getByDate,
  getMyBookings,
  getAllBookings,
  cancel,
};