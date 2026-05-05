const { Booking, Field, sequelize } = require("../models");
const { Op } = require("sequelize");

// ================= GET MY BOOKINGS =================
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.findAll({
      where: { userId },
      include: [Field],
      order: [["start_time", "DESC"]],
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    // 🔥 validate
    if (!field_id || !start_time || !end_time || !name || !phone) {
      throw new Error("Missing required fields");
    }

    if (new Date(end_time) <= new Date(start_time)) {
      throw new Error("Invalid time");
    }

    // 🔥 check trùng giờ (CHUẨN)
    const conflict = await Booking.findOne({
      where: {
        fieldId: field_id,
        status: { [Op.ne]: "cancelled" },
        [Op.and]: [
          { start_time: { [Op.lt]: new Date(end_time) } },
          { end_time: { [Op.gt]: new Date(start_time) } },
        ],
      },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (conflict) throw new Error("Time slot already booked");

    // 🔥 lấy sân + tính tiền
    const field = await Field.findByPk(field_id);
    if (!field) throw new Error("Field not found");

    const hours =
      (new Date(end_time) - new Date(start_time)) / 3600000;

    const total = hours * field.price_per_hour;

    // 🔥 tạo booking
    const booking = await Booking.create(
      {
        userId: req.user?.id || null, // cho phép khách vãng lai
        fieldId: field_id,
        start_time,
        end_time,

        name,
        phone,
        email,

        status: "confirmed",
        total_price: total,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      message: "Booking success",
      booking,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ message: err.message });
  }
};

// ================= GET BY DATE =================
exports.getByDate = async (req, res) => {
  try {
    const { field_id, date } = req.query;

    const start = new Date(date + " 00:00:00");
    const end = new Date(date + " 23:59:59");

    const bookings = await Booking.findAll({
      where: {
        fieldId: field_id,
        status: { [Op.ne]: "cancelled" },
        start_time: { [Op.between]: [start, end] },
      },
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= CANCEL =================
exports.cancel = async (req, res) => {
  try {
    await Booking.update(
      { status: "cancelled" },
      { where: { id: req.params.id } }
    );

    res.json({ message: "Cancelled" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};