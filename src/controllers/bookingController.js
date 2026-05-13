const {
  booking: Booking,
  field: Field,
  user: User,
  sequelize,
} = require("../models");

const { Op } = require("sequelize");

// ================= GET IO =================
const getIO = (req) => req.app.get("io");

// ================= FORMAT DATE ONLY =================
const formatDateOnly = (date) => {
  return new Date(date).toISOString().split("T")[0];
};

// ================= CLEAN EXPIRED HOLDS =================
const cleanExpiredHold = async (io = null) => {
  try {
    const expired = await Booking.findAll({
      where: {
        status: "holding",
        hold_until: {
          [Op.lt]: new Date(),
        },
      },
    });

    if (io && expired.length > 0) {
      expired.forEach((b) => {
        io.to(`field_${b.fieldId}`).emit("slot-released", {
          field_id: b.fieldId,
          booking_date: formatDateOnly(b.start_time),
          start_time: b.start_time,
          end_time: b.end_time,
        });
      });
    }

    await Booking.destroy({
      where: {
        status: "holding",
        hold_until: {
          [Op.lt]: new Date(),
        },
      },
    });
  } catch (err) {
    console.error("cleanExpiredHold error:", err);
  }
};

// ================= HOLD SLOT =================
const holdSlot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const io = getIO(req);

    await cleanExpiredHold(io);

    const { field_id, booking_date, start_time } = req.body;

    if (!field_id || !booking_date || !start_time) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const fixedTime = start_time.toString().padStart(8, "0");

    const startDateTime = new Date(
      `${booking_date}T${fixedTime}`
    );

    const endDateTime = new Date(
      startDateTime.getTime() + 60 * 60 * 1000
    );

    if (isNaN(startDateTime.getTime())) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid time",
      });
    }

    // ================= CHECK SAME HOLD =================
    const existingHold = await Booking.findOne({
      where: {
        userId: req.user.id,
        fieldId: field_id,
        start_time: startDateTime,
        status: "holding",
        hold_until: {
          [Op.gt]: new Date(),
        },
      },
      transaction,
    });

    // ================= TOGGLE OFF =================
    if (existingHold) {
      await existingHold.destroy({ transaction });

      await transaction.commit();

      io.to(`field_${field_id}`).emit("slot-released", {
        field_id,
        booking_date,
        start_time: existingHold.start_time,
        end_time: existingHold.end_time,
      });

      return res.json({
        success: true,
        cancelled: true,
        message: "Hold cancelled",
      });
    }

    // ================= AUTO CLEAR OLD HOLDS =================
    const oldHolds = await Booking.findAll({
      where: {
        userId: req.user.id,
        status: "holding",
      },
      transaction,
    });

    for (const old of oldHolds) {
      io.to(`field_${old.fieldId}`).emit("slot-released", {
        field_id: old.fieldId,
        booking_date: formatDateOnly(old.start_time),
        start_time: old.start_time,
        end_time: old.end_time,
      });

      await old.destroy({ transaction });
    }

    // ================= CHECK CONFLICT =================
    const conflict = await Booking.findOne({
      where: {
        fieldId: field_id,
        status: {
          [Op.in]: ["holding", "booked"],
        },
        [Op.and]: [
          {
            start_time: {
              [Op.lt]: endDateTime,
            },
          },
          {
            end_time: {
              [Op.gt]: startDateTime,
            },
          },
        ],
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (conflict) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Slot already taken",
      });
    }

    // ================= CREATE HOLD =================
    const holdUntil = new Date(
      Date.now() + 5 * 60 * 1000
    );

    const booking = await Booking.create(
      {
        userId: req.user.id,
        fieldId: field_id,

        // 🔥 FIX
        booking_date,

        start_time: startDateTime,
        end_time: endDateTime,

        status: "holding",
        hold_until: holdUntil,
        total_price: 0,
      },
      {
        transaction,
      }
    );

    await transaction.commit();

    io.to(`field_${field_id}`).emit("slot-held", {
      field_id,
      booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      user_id: req.user.id,
      user_name: req.user.name,
    });

    return res.json({
      success: true,
      booking,
    });

  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}

    console.error("holdSlot error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= CANCEL HOLD =================
const cancelHold = async (req, res) => {
  try {
    const io = getIO(req);

    const { field_id, booking_date, start_time } = req.body;

    if (!field_id || !booking_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const fixedTime = start_time.toString().padStart(8, "0");

    const startDateTime = new Date(
      `${booking_date}T${fixedTime}`
    );

    const booking = await Booking.findOne({
      where: {
        userId: req.user.id,
        fieldId: field_id,
        start_time: startDateTime,
        status: "holding",
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Hold not found",
      });
    }

    await booking.destroy();

    io.to(`field_${field_id}`).emit("slot-released", {
      field_id,
      booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
    });

    return res.json({
      success: true,
      message: "Hold cancelled",
    });

  } catch (err) {
    console.error("cancelHold error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= CREATE BOOKING =================
const createBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const io = getIO(req);

    const { field_id, booking_date, start_time } = req.body;

    if (!field_id || !booking_date || !start_time) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const fixedTime = start_time.toString().padStart(8, "0");

    const startDateTime = new Date(
      `${booking_date}T${fixedTime}`
    );

    const booking = await Booking.findOne({
      where: {
        userId: req.user.id,
        fieldId: field_id,
        start_time: startDateTime,
        status: "holding",
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "No holding slot found",
      });
    }

    // 🔥 FIX
    booking.booking_date = booking_date;

    booking.status = "booked";
    booking.hold_until = null;

    await booking.save({ transaction });

    await transaction.commit();

    io.to(`field_${field_id}`).emit("slot-booked", {
      field_id,
      booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      user_id: req.user.id,
    });

    return res.json({
      success: true,
      message: "Booking created successfully",
      booking,
    });

  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}

    console.error("createBooking error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET BOOKINGS BY DATE =================
const getByDate = async (req, res) => {
  try {
    await cleanExpiredHold(getIO(req));

    const { field_id, booking_date } = req.query;

    // 🔥 nếu không truyền query -> trả tất cả
    if (!field_id || !booking_date) {

      const bookings = await Booking.findAll({
        include: [
          {
            model: User,
            attributes: ["id", "name"],
          },
          {
            model: Field,
          },
        ],

        order: [["start_time", "ASC"]],
      });

      return res.json({
        success: true,
        bookings,
      });
    }

    const bookings = await Booking.findAll({
      where: {
        fieldId: field_id,

        booking_date,

        status: {
          [Op.in]: ["holding", "booked"],
        },
      },

      include: [
        {
          model: User,
          attributes: ["id", "name"],
        },
      ],

      order: [["start_time", "ASC"]],
    });

    const result = bookings.map((b) => ({
      id: b.id,
      fieldId: b.fieldId,
      booking_date: b.booking_date,
      userId: b.userId,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      hold_until: b.hold_until,
      user: b.user,
    }));

    return res.json({
      success: true,
      bookings: result,
    });

  } catch (err) {
    console.error("getByDate error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET MY BOOKINGS =================
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: {
        userId: req.user.id,
      },

      include: [
        {
          model: Field,
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      bookings,
    });

  } catch (err) {
    console.error("getMyBookings error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET ALL BOOKINGS =================
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: Field,
        },
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      bookings,
    });

  } catch (err) {
    console.error("getAllBookings error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= CANCEL BOOKING =================
const cancel = async (req, res) => {
  try {
    const io = getIO(req);

    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = "cancelled";

    await booking.save();

    io.to(`field_${booking.fieldId}`).emit("slot-released", {
      field_id: booking.fieldId,
      booking_date: formatDateOnly(booking.start_time),
      start_time: booking.start_time,
      end_time: booking.end_time,
    });

    return res.json({
      success: true,
      message: "Booking cancelled",
    });

  } catch (err) {
    console.error("cancel booking error:", err);

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
  getByDate,
  getMyBookings,
  getAllBookings,
  cancel,
};