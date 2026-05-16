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
const formatVNTime = (date) => {
  if (!date) return null;

  return new Date(date).toLocaleTimeString(
    "vi-VN",
    {
      timeZone:
        "Asia/Ho_Chi_Minh",

      hour: "2-digit",
      minute: "2-digit",
    }
  );
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
  return {
    ...booking.toJSON(),

    start_time:
      formatVNTime(
        booking.start_time
      ),

    end_time:
      formatVNTime(
        booking.end_time
      ),
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
            [Op.lt]: new Date(),
          },
        },
      });

    if (
      io &&
      expired.length > 0
    ) {
      for (const b of expired) {
        emitSlotUpdate({
          io,
          fieldId: b.fieldId,
          bookingDate:
            b.booking_date,
          startTime:
            b.start_time,
          status: "available",
          userId: b.userId,
        });
      }
    }

    await Booking.destroy({
      where: {
        status: "holding",

        hold_until: {
          [Op.lt]: new Date(),
        },
      },
    });

    if (expired.length > 0) {
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
      start_time
        .toString()
        .padStart(8, "0");

    const startDateTime =
      new Date(
        `${booking_date}T${fixedTime}`
      );

    const endDateTime =
      new Date(
        startDateTime.getTime() +
          60 * 60 * 1000
      );

    if (
      isNaN(
        startDateTime.getTime()
      )
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid time",
      });
    }

    // ================= CHECK CONFLICT =================
    const conflict =
      await Booking.findOne({
        where: {
          fieldId: field_id,

          status: {
            [Op.in]: [
              "holding",
              "booked",
            ],
          },

          [Op.and]: [
            {
              start_time: {
                [Op.lt]:
                  endDateTime,
              },
            },
            {
              end_time: {
                [Op.gt]:
                  startDateTime,
              },
            },
          ],
        },

        transaction,

        lock:
          transaction.LOCK
            .UPDATE,
      });

    // ================= SLOT TAKEN =================
    if (conflict) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Slot already taken",
      });
    }

    // ================= REMOVE OLD HOLDS =================
    const oldHolds =
      await Booking.findAll({
        where: {
          userId: req.user.id,
          status: "holding",
        },

        transaction,
      });

    for (const old of oldHolds) {
      emitSlotUpdate({
        io,
        fieldId: old.fieldId,
        bookingDate:
          old.booking_date,
        startTime:
          old.start_time,
        status:
          "available",
        userId: old.userId,
      });

      await old.destroy({
        transaction,
      });
    }

    // ================= HOLD 5 MINUTES =================
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
        },
        {
          transaction,
        }
      );

    await transaction.commit();

    // ================= REALTIME =================
    emitSlotUpdate({
      io,
      fieldId: field_id,
      bookingDate:
        booking_date,
      startTime:
        booking.start_time,
      status: "holding",
      userId: req.user.id,
      holdUntil,
    });

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

    if (
      !field_id ||
      !booking_date ||
      !start_time
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const fixedTime =
      start_time
        .toString()
        .padStart(8, "0");

    const startDateTime =
      new Date(
        `${booking_date}T${fixedTime}`
      );

    const booking =
      await Booking.findOne({
        where: {
          userId: req.user.id,

          fieldId: field_id,

          start_time:
            startDateTime,

          status: "holding",
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Hold not found",
      });
    }

    await booking.destroy();

    emitSlotUpdate({
      io,
      fieldId: field_id,
      bookingDate:
        booking_date,
      startTime:
        booking.start_time,
      status: "available",
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message:
        "Hold cancelled",
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
      start_time
        .toString()
        .padStart(8, "0");

    const startDateTime =
      new Date(
        `${booking_date}T${fixedTime}`
      );

    const booking =
      await Booking.findOne({
        where: {
          userId: req.user.id,

          fieldId: field_id,

          start_time:
            startDateTime,

          status: "holding",

          hold_until: {
            [Op.gt]:
              new Date(),
          },
        },

        transaction,

        lock:
          transaction.LOCK
            .UPDATE,
      });

    if (!booking) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "No valid holding slot found",
      });
    }

    booking.status = "booked";

    booking.hold_until = null;

    booking.booking_date =
      booking_date;

    await booking.save({
      transaction,
    });

    await transaction.commit();

    emitSlotUpdate({
      io,
      fieldId: field_id,
      bookingDate:
        booking_date,
      startTime:
        booking.start_time,
      status: "booked",
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message:
        "Booking created successfully",

      booking:
        formatBookingResponse(
          booking
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
  const transaction =
    await sequelize.transaction();

  try {
    const io = getIO(req);

    const booking =
      await Booking.findByPk(
        req.params.id,
        {
          transaction,
          lock:
            transaction.LOCK
              .UPDATE,
        }
      );

    if (!booking) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    const {
      booking_date,
      start_time,
    } = req.body;

    if (
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
      start_time
        .toString()
        .padStart(8, "0");

    const newStart =
      new Date(
        `${booking_date}T${fixedTime}`
      );

    const newEnd =
      new Date(
        newStart.getTime() +
          60 * 60 * 1000
      );

    // ================= CHECK CONFLICT =================
    const conflict =
      await Booking.findOne({
        where: {
          id: {
            [Op.ne]:
              booking.id,
          },

          fieldId:
            booking.fieldId,

          status: {
            [Op.in]: [
              "holding",
              "booked",
            ],
          },

          [Op.and]: [
            {
              start_time: {
                [Op.lt]:
                  newEnd,
              },
            },
            {
              end_time: {
                [Op.gt]:
                  newStart,
              },
            },
          ],
        },

        transaction,
      });

    if (conflict) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "New slot already taken",
      });
    }

    emitSlotUpdate({
      io,
      fieldId:
        booking.fieldId,
      bookingDate:
        booking.booking_date,
      startTime:
        booking.start_time,
      status: "available",
      userId:
        booking.userId,
    });

    booking.booking_date =
      booking_date;

    booking.start_time =
      newStart;

    booking.end_time =
      newEnd;

    await booking.save({
      transaction,
    });

    await transaction.commit();

    emitSlotUpdate({
      io,
      fieldId:
        booking.fieldId,
      bookingDate:
        booking.booking_date,
      startTime:
        booking.start_time,
      status:
        booking.status,
      userId:
        booking.userId,
    });

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
    try {
      await transaction.rollback();
    } catch (_) {}

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
    const io = getIO(req);

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

    emitSlotUpdate({
      io,
      fieldId:
        booking.fieldId,
      bookingDate:
        booking.booking_date,
      startTime:
        booking.start_time,
      status: "available",
      userId:
        booking.userId,
    });

    booking.status =
      "cancelled";

    booking.hold_until =
      null;

    await booking.save();

    return res.json({
      success: true,
      message:
        "Booking cancelled successfully",
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
    await cleanExpiredHold(
      getIO(req)
    );

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

// ================= CANCEL BOOKING =================
const cancel = async (
  req,
  res
) => {
  try {
    const io = getIO(req);

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

    emitSlotUpdate({
      io,
      fieldId:
        booking.fieldId,
      bookingDate:
        booking.booking_date,
      startTime:
        booking.start_time,
      status: "available",
      userId:
        booking.userId,
    });

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