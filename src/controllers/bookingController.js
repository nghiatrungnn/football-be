  const {
    booking: Booking,
    field: Field,
    user: User,
    sequelize,
  } = require("../models");

  const voucherService = require("../services/voucherService");

  const { Op } = require("sequelize");

  const axios = require("axios");

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

      refund_amount:
  booking.refund_amount || 0,

refund_reason:
  booking.refund_reason,

refund_requested_at:
  booking.refund_requested_at,

refunded_at:
  booking.refunded_at,

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

      booking_date,

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

// FORCE DB UPDATE

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

  bookings,

  duration,

  voucher_code,

  name,
  phone,
  email,

  payment_method,
  transaction_code,
  payment_note,

  payment_group,

  field_type,
  field_name,
} = req.body;

console.log(req.body);

      if (
  !field_id ||
  !bookings ||
  !Array.isArray(bookings) ||
  bookings.length === 0
) {

        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Missing fields",
        });
      }

      // ================= FIELD =================

const field =
  await Field.findByPk(field_id);

if (!field) {

  await transaction.rollback();

  return res.status(404).json({
    success: false,
    message: "Field not found",
  });
}

// ================= CALCULATE PRICE =================

const totalSlots =
  bookings.length;

const totalHours =
  (duration / 60) *
  totalSlots;

// giá sân / giờ
const fieldPrice =
  Number(field.price_per_hour || 0);

// tổng giá gốc
const total_price =
  fieldPrice * totalHours;

// ================= APPLY VOUCHER =================

let discountAmount = 0;

let finalAmount =
  total_price;

if (voucher_code) {

  const voucherResult =
    await voucherService.validateVoucher({
      code: voucher_code,

      amount: total_price,

      transaction,
    });

  if (!voucherResult.valid) {

    await transaction.rollback();

    return res.status(400).json({
      success: false,
      message:
        voucherResult.message,
    });
  }

  discountAmount =
    voucherResult.discount;

  finalAmount =
    voucherResult.finalAmount;
}

const createdBookings = [];

const paymentGroup =
payment_group ||
`GROUP_${Date.now()}_${req.user.id}`;

      for (const item of bookings) {

  const bookingDate =
    item.date;

  const slot =
    item.slot;

  const fixedTime =
    slot.toString().length === 5
      ? `${slot}:00`
      : slot.toString();

  const startDateTime =
    fixedTime;

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

     booking_date:
       bookingDate,

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
 `Slot ${slot} ngày ${bookingDate} chưa được giữ`,
          });
        }

  // =====================================================
  // CASH
  // =====================================================

if (payment_method === "cash") {

  booking.status = "booked";

  booking.payment_status = "pending";

  booking.hold_until = null;
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
  payment_method;

booking.transaction_code =
  transaction_code || null;

booking.payment_note =
  payment_note || null;

booking.field_type =
  field_type || field.type;

booking.field_name =
  field_name || field.name;

// =====================================================
// PAYMENT GROUP
// =====================================================

booking.payment_group =
  paymentGroup;

// =====================================================
// PRICE
// =====================================================

const bookingPrice =
  Math.round(
    total_price / bookings.length
  );

const bookingFinal =
  Math.round(
    finalAmount / bookings.length
  );

const bookingDiscount =
  Math.round(
    discountAmount / bookings.length
  );

  booking.total_price =
  bookingPrice;

booking.discount_amount =
  bookingDiscount;

booking.final_amount =
  bookingFinal;

  booking.duration =
  duration;

booking.voucher_code =
  voucher_code || null;

// =====================================================
// SAVE
// =====================================================

await booking.save({
  transaction,
});

// SAVE ARRAY
createdBookings.push(booking);

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
    bookingDate,

  startTime:
    emitTime,

  status: booking.status,

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

if (voucher_code) {

  await voucherService
    .increaseVoucherUsedCount({
      voucherCode: voucher_code,
      transaction,
    });

  await voucherService
    .createUserVoucher({
      userId: req.user.id,
      voucherCode: voucher_code,
      bookingId: createdBookings[0].id,
      transaction,
    });
}

      await transaction.commit();

// =====================================================
// CASH NOTIFICATION
// =====================================================

if (
  payment_method === "cash"
) {

  const notificationService =
    require(
      "../services/notificationService"
    );

  for (const booking of createdBookings) {

 const notification =
  await notificationService
    .createNotification({

      userId:
        booking.userId,

      title:
        "Đặt sân thành công",

      message:
        `Bạn đã đặt sân ${booking.field_name} lúc ${booking.start_time}`,

      type:
        "booking",

      icon:
        "sports_soccer",

      route:
        "/booking-info",

      referenceId:
        booking.id,
    });

  io.to(
    `user_${booking.userId}`
  ).emit(
    "new_notification",
    notification
  );

  // ================= ADMIN NOTIFICATION =================

const admin =
  await User.findOne({
    where: {
      email: "admin@gmail.com",
    },
  });

if (!admin) continue;

  const adminNotification =
  await notificationService
    .createNotification({

      userId: admin.id,

      title:
        "Có đơn đặt sân mới",

      message:
        `${booking.name} vừa đặt sân`,

      type:
  "admin",
  
      icon:
        "admin_panel_settings",

      route:
        "/admin/bookings",

      referenceId:
        booking.id,
    });

io.to(`user_${admin.id}`).emit(
  "new_notification",
  adminNotification
);


}
}

return res.json({

        success: true,

        message:
        "Booking created successfully",

        booking: formatBookingResponse(
  createdBookings[0]
),

        bookings:
        createdBookings.map((b) =>
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

  const transaction =
      await sequelize.transaction();

  try {

    const io = getIO(req);

    const booking =
        await Booking.findByPk(
      req.params.id
    );

    if (!booking) {

      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // ================= DATA =================

    const {
  name,
  phone,
  email,
  status,
  payment_status,
  payment_method,
  total_price,
  slots,
  fieldId,
} = req.body;

    // ================= UPDATE INFO =================

    booking.name =
        name ?? booking.name;

    booking.phone =
        phone ?? booking.phone;

    booking.email =
    email ?? booking.email;

booking.status =
    status ?? booking.status;

    booking.payment_status =
    payment_status ??
    booking.payment_status;

    booking.payment_method =
        payment_method ??
        booking.payment_method;

    booking.total_price =
        total_price ??
        booking.total_price;

    booking.fieldId =
        fieldId ??
        booking.fieldId;

    if (payment_status) {

  await Booking.update(
    {
      payment_status,
    },
    {
      where: {
        payment_group:
          booking.payment_group,
      },
      transaction,
    }
  );

} else {

  await booking.save({
    transaction,
  });

}

    // =====================================================
    // UPDATE SLOT
    // =====================================================

    if (
        slots &&
        Array.isArray(slots) &&
        slots.length > 0
    ) {

      const slot =
          slots[0];

      const start =
          slot.start.length === 5
              ? `${slot.start}:00`
              : slot.start;

      const end =
          slot.end.length === 5
              ? `${slot.end}:00`
              : slot.end;

      // ================= CHECK CONFLICT =================

      const conflict =
          await Booking.findOne({

        where: {

          id: {
            [Op.ne]:
            booking.id,
          },

          fieldId:
fieldId ??
booking.fieldId,

          booking_date:
          slot.date,

          status: {
            [Op.in]: [
              "holding",
              "booked",
            ],
          },

          [Op.and]: [

            sequelize.where(
              sequelize.col(
                  "start_time"
              ),
              "<",
              end
            ),

            sequelize.where(
              sequelize.col(
                  "end_time"
              ),
              ">",
              start
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
          "Khung giờ bị trùng",
        });
      }

      // ================= EMIT OLD SLOT =================

      emitSlotUpdate({

        io,

        fieldId:
        booking.fieldId,

        bookingDate:
        booking.booking_date,

        startTime:
        booking.start_time,

        status:
        "cancelled",
      });

      // ================= UPDATE SLOT =================

      booking.fieldId =
    fieldId ??
    booking.fieldId;

booking.booking_date =
    slot.date;

booking.start_time =
    start;

booking.end_time =
    end;

      await booking.save({
        transaction,
      });

      // ================= EMIT NEW SLOT =================

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
      });
    }

    await transaction.commit();

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

      const {
        field_id,
        booking_date,
      } = req.query;

      const whereClause = {

  // ================= BỎ BOOKING ĐÃ HỦY =================
  status: {
    [Op.notIn]: [
      "cancelled",
    ],
  },
};

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
const grouped = {};

bookings.forEach((b) => {

  const booking =
    formatBookingResponse(b);

  const key =
    booking.payment_group ||
    booking.id;

  if (!grouped[key]) {

    grouped[key] = {
      ...booking,
      slots: [],
    };
  }

  grouped[key].slots.push({
    date:
      booking.booking_date,

    start:
      booking.start_time,

    end:
      booking.end_time,

    price:
      booking.final_amount ||
      booking.total_price ||
      0,
  });
});

return res.json({
  success: true,
  bookings:
    Object.values(grouped),
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

    const io = getIO(req);

    const booking =
      await Booking.findByPk(
        req.params.id
      );

      console.log(
  "CANCEL BOOKING ID =>",
  req.params.id
);

console.log(
  "CANCEL BODY =>",
  req.body
);

    if (!booking) {

      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    // ================= CHECK USER =================

    if (
      booking.userId !== req.user.id
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Không có quyền",
      });
    }

    // ================= ĐÃ HỦY =================

    if (
      booking.status ===
      "cancelled"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Đơn đã hủy",
      });
    }

    // ================= TIME CHECK =================

    const bookingDateTime =
      new Date(
        `${booking.booking_date}T${booking.start_time}`
      );

    const now = new Date();

    const diffHours =
      (bookingDateTime - now) /
      (1000 * 60 * 60);

    if (diffHours < 2) {

      return res.status(400).json({
        success: false,
        message:
          "Chỉ được hủy trước 2 tiếng",
      });
    }

    // =====================================================
    // CASH
    // =====================================================

    if (
      booking.payment_method ===
      "cash"
    ) {

      booking.status =
        "cancelled";

      booking.payment_status =
        "cancelled";

      booking.hold_until =
        null;

      await booking.save();

      const notificationService =
  require(
    "../services/notificationService"
  );

const notification =
  await notificationService
    .createNotification({

      userId:
        booking.userId,

      title:
        "Đã hủy đặt sân",

      message:
        "Đơn đặt sân của bạn đã được hủy",

      type:
        "booking",

      icon:
        "cancel",

      route:
        "/history",

      referenceId:
        booking.id,
    });

io.to(
  `user_${booking.userId}`
).emit(
  "new_notification",
  notification
);

      // mở slot realtime
      emitSlotUpdate({
        io,

        fieldId:
          booking.fieldId,

        bookingDate:
          booking.booking_date,

        startTime:
          booking.start_time,

        status:
          "cancelled",
      });
      return res.json({
        success: true,

        message:
          "Đã hủy sân",
      });
    }

    // =====================================================
    // PAYOS
    // =====================================================

if (
  !req.body.bank_name ||
  !req.body.bank_number ||
  !req.body.bank_owner
) {

  return res.status(400).json({
    success: false,
    message:
      "Vui lòng nhập đầy đủ thông tin ngân hàng",
  });
}

    booking.payment_status =
  "refund_pending";

booking.refund_status =
  "pending";

// ================= REFUND AMOUNT =================

booking.refund_amount =
  booking.final_amount ||
  booking.total_price ||
  0;

// ================= BANK INFO =================

booking.refund_bank_name =
  req.body.bank_name;

booking.refund_bank_number =
  req.body.bank_number;

booking.refund_bank_owner =
  req.body.bank_owner;

// ================= REFUND REASON =================

booking.refund_reason =
  req.body.reason || null;

  booking.refund_requested_at =
  new Date();

await booking.save();

const notificationService =
  require(
    "../services/notificationService"
  );

const admin =
  await User.findOne({
    where: {
      email: "admin@gmail.com",
    },
  });

if (!admin) {
  return res.status(404).json({
    success: false,
    message: "Admin not found",
  });
}

const adminNotification =
  await notificationService
    .createNotification({

      userId: admin.id,

      title:
        "Yêu cầu hoàn tiền",

      message:
        `${req.user.name} yêu cầu hoàn tiền booking #${booking.id}`,

      type:
        "refund",

      icon:
        "payments",

      route:
        "/admin/bookings",

      referenceId:
        booking.id,
    });

io.to(`user_${admin.id}`).emit(
  "new_notification",
  adminNotification
);

console.log(
  "REFUND REQUEST =>",
  {
    id: booking.id,

    refund_amount:
      booking.refund_amount,

    refund_bank_name:
      booking.refund_bank_name,
  }
);
    return res.json({
      success: true,

      message:
        "Đã gửi yêu cầu hoàn tiền",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= REFUND BOOKING =================

const refundBooking =
  async (req, res) => {

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

    // =====================================================
// ALREADY REFUNDED
// =====================================================

if (
  booking.payment_status ===
  "refunded"
) {

  return res.status(400).json({
    success: false,
    message:
      "Đơn đã hoàn tiền",
  });
}

// =====================================================
// NOT REFUND PENDING
// =====================================================

if (
  booking.payment_status !==
  "refund_pending"
) {

  return res.status(400).json({
    success: false,
    message:
      "Đơn chưa yêu cầu hoàn tiền",
  });
}

    // =====================================================
    // PAYOS REFUND
    // =====================================================

    // =====================================================
// CHECK PAYMENT LINK
// =====================================================

if (
  booking.payment_method === "banking" &&
  booking.payment_link_id
) {

  const refundRes =
    await axios.post(
      `https://api-merchant.payos.vn/v2/payment-requests/${booking.payment_link_id}/cancel`,
      {
        cancellationReason:
          "Khach huy san"
      },
      {
        headers: {
          "x-client-id":
            process.env.PAYOS_CLIENT_ID,

          "x-api-key":
            process.env.PAYOS_API_KEY,
        },
      }
    );
}
    booking.status =
  "cancelled";

booking.payment_status =
  "refunded";

booking.refund_status =
  "done";

booking.refunded_at =
  new Date();

booking.hold_until =
  null;

await booking.save();

const notificationService =
  require(
    "../services/notificationService"
  );

const notification =
  await notificationService
    .createNotification({

      userId:
        booking.userId,

      title:
        "Hoàn tiền thành công",

      message:
        `Bạn đã được hoàn ${booking.refund_amount} VNĐ`,

      type:
        "refund",

      icon:
        "payments",

      route:
        "/history",

      referenceId:
        booking.id,
    });

io.to(
  `user_${booking.userId}`
).emit(
  "new_notification",
  notification
);

    // mở slot lại
    emitSlotUpdate({
      io,

      fieldId:
        booking.fieldId,

      bookingDate:
        booking.booking_date,

      startTime:
        booking.start_time,

      status:
        "cancelled",
    });

    return res.json({
      success: true,
      message:
        "Hoàn tiền thành công",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET BOOKING BY ID =================
const getBookingById =
async (req, res) => {

  try {

    const booking =
    await Booking.findByPk(
      req.params.id,
      {
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
      }
    );

    if (!booking) {

      return res.status(404).json({
        success: false,
        message:
        "Booking not found",
      });
    }

    return res.json({

      success: true,

      booking:
      formatBookingResponse(
        booking
      ),
    });

  } catch (err) {

    console.error(
      "❌ getBookingById error:",
      err
    );

    return res.status(500).json({

      success: false,

      message:
      err.message,
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
  getBookingById,
  cancel,
  refundBooking,
};