const {
  booking: Booking,
  field: Field,
  user: User,
  sequelize,
} = require("../models");

const { Op } = require("sequelize");

// ================= GET ALL BOOKINGS =================
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
        {
          model: Field,
          attributes: ["id", "name", "address", "price_per_hour"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(bookings);
  } catch (err) {
    console.error("Get all bookings error:", err);

    res.status(500).json({
      message: "Get bookings failed",
      error: err.message,
    });
  }
};

// ================= GET MY BOOKINGS =================
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.findAll({
      where: { userId },

      include: [
        {
          model: Field,
          attributes: ["id", "name", "address", "price_per_hour"],
        },
      ],

      order: [["start_time", "DESC"]],
    });

    res.json(bookings);
  } catch (err) {
    console.error("Get my bookings error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= CREATE BOOKING =================
exports.createBooking = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      field_id,
      start_time,
      end_time,
      name,
      phone,
      email,
    } = req.body;

    // ================= VALIDATE =================
    if (!field_id || !start_time || !end_time || !name || !phone) {
      throw new Error("Missing required fields");
    }

    if (new Date(end_time) <= new Date(start_time)) {
      throw new Error("Invalid time");
    }

    // ================= CHECK CONFLICT =================
    const conflict = await Booking.findOne({
      where: {
        fieldId: field_id,

        status: {
          [Op.ne]: "cancelled",
        },

        [Op.and]: [
          {
            start_time: {
              [Op.lt]: new Date(end_time),
            },
          },
          {
            end_time: {
              [Op.gt]: new Date(start_time),
            },
          },
        ],
      },

      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (conflict) {
      throw new Error("Time slot already booked");
    }

    // ================= GET FIELD =================
    const field = await Field.findByPk(field_id);

    if (!field) {
      throw new Error("Field not found");
    }

    // ================= CALCULATE PRICE =================
    const hours =
      (new Date(end_time) - new Date(start_time)) / 3600000;

    const total = hours * field.price_per_hour;

    // ================= CREATE BOOKING =================
    const booking = await Booking.create(
      {
        userId: req.user?.id || null,

        fieldId: field_id,

        start_time,
        end_time,

        name,
        phone,
        email,

        status: "confirmed",

        total_price: total,
      },
      {
        transaction: t,
      }
    );

    await t.commit();

    res.json({
      message: "Booking success",
      booking,
    });
  } catch (err) {
    await t.rollback();

    console.error("Create booking error:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};

// ================= GET BOOKINGS BY DATE =================
exports.getByDate = async (req, res) => {
  try {
    const { field_id, date } = req.query;

    if (!field_id || !date) {
      return res.status(400).json({
        message: "field_id and date are required",
      });
    }

    const start = new Date(date + " 00:00:00");
    const end = new Date(date + " 23:59:59");

    const bookings = await Booking.findAll({
      where: {
        fieldId: field_id,

        status: {
          [Op.ne]: "cancelled",
        },

        start_time: {
          [Op.between]: [start, end],
        },
      },

      order: [["start_time", "ASC"]],
    });

    res.json(bookings);
  } catch (err) {
    console.error("Get bookings by date error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= CANCEL BOOKING =================
exports.cancel = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    await booking.update({
      status: "cancelled",
    });

    res.json({
      message: "Cancelled",
    });
  } catch (err) {
    console.error("Cancel booking error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};