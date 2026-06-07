const axios =
  require("axios");

const crypto =
  require("crypto");

const { sequelize } =
  require("../models");

const voucherService =
  require("../services/voucherService");

const notificationService =
  require(
    "../services/notificationService"
  );

  const { Op } =
  require("sequelize");

  
const {
  booking: Booking,
  user: User,
  field: Field,
} = require("../models");

// =====================================================
// CREATE PAYMENT
// =====================================================

const createPayment =
  async (req, res) => {
    try {

      const {
  bookingIds,
  amount,
  platform,
} = req.body;

console.log(
  "BOOKING IDS =>",
  bookingIds
);

if (
  !bookingIds ||
  !Array.isArray(bookingIds) ||
  bookingIds.length === 0
) {

  return res.status(400).json({
    success: false,
    message:
      "bookingIds invalid",
  });
}

      // =====================================================
      // FIND BOOKING
      // =====================================================

      const bookings =
await Booking.findAll({

  where: {

    id: {
      [Op.in]:
        bookingIds,
    },
  },

  include: [
    {
      model: User,
      attributes: ["name"],
    },
    {
      model: Field,
      attributes: ["name"],
    },
  ],
});

if (!bookings.length) {

  return res.status(404).json({
    success: false,
    message: "Booking not found",
  });
}

// booking đầu tiên
const booking = bookings[0];

// =====================================================
// CHECK PAYMENT GROUP
// =====================================================

const paymentGroup =
  booking.payment_group;

if (!paymentGroup) {

  return res.status(400).json({
    success: false,
    message:
      "payment_group missing",
  });
}

      // =====================================================
      // ALREADY PAID
      // =====================================================

      if (
  booking.payment_status ===
    "paid" ||
  booking.payment_status ===
    "deposit_paid"
) {

  return res.status(400).json({
    success: false,
    message:
      "Booking already paid",
  });
}

      // =====================================================
      // ORDER CODE
      // =====================================================

      const orderCode = booking.id;

     // =====================================================
// UPDATE ALL BOOKINGS IN GROUP
// =====================================================

for (const b of bookings) {

  b.transaction_code =
    orderCode.toString();

  b.payment_status =
    "pending";

  b.status =
    "holding";

  await b.save();
}

      // =====================================================
      // RETURN URL
      // =====================================================

      console.log(
  "PLATFORM =>",
  platform
);

const returnUrl =
  platform === "web"
    ? "https://datn-w9iy-nq07tgd4w-hoang-tu-s-projects.vercel.app/payment-success"
    : "footballbooking://payment-success";

const cancelUrl =
  platform === "web"
    ? "https://datn-w9iy-nq07tgd4w-hoang-tu-s-projects.vercel.app/payment-cancel"
    : "footballbooking://payment-cancel";

      // =====================================================
      // BODY
      // =====================================================

      const body = {
  orderCode,

  amount:
    bookings.reduce(
      (sum, b) =>
        sum +
        (b.deposit_amount || 0),
      0
    ),

  description:
    `Ten:${booking.user.name}San:${booking.field.name}`.slice(0, 25),

  returnUrl,

  cancelUrl,
};

      // =====================================================
      // SIGNATURE
      // =====================================================

      const signatureData =
        `amount=${body.amount}&cancelUrl=${body.cancelUrl}&description=${body.description}&orderCode=${body.orderCode}&returnUrl=${body.returnUrl}`;

      const signature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .PAYOS_CHECKSUM_KEY
          )
          .update(
            signatureData
          )
          .digest("hex");

      // =====================================================
      // CREATE PAYMENT
      // =====================================================

      const response =
        await axios.post(
          "https://api-merchant.payos.vn/v2/payment-requests",
          {
            ...body,
            signature,
          },
          {
            headers: {
              "x-client-id":
                process.env
                  .PAYOS_CLIENT_ID,

              "x-api-key":
                process.env
                  .PAYOS_API_KEY,
            },
          }
        );

      console.log(
        "PAYOS RESPONSE =>",
        response.data
      );

      console.log(
  "PAYOS FULL RESPONSE =>",
  JSON.stringify(
    response.data,
    null,
    2
  )
);

// =====================================================
// SAVE PAYMENT LINK ID FOR ALL BOOKINGS
// =====================================================

if (
  !response.data ||
  !response.data.data
) {

  console.log(
    "PAYOS ERROR =>",
    response.data
  );

  return res.status(400).json({
    success: false,
    message:
      "PayOS không trả về link thanh toán",
  });
}

for (const b of bookings) {

  b.payment_link_id =
    response.data.data.paymentLinkId;

  await b.save();
}

      // =====================================================
      // RETURN
      // =====================================================

      return res.json({
        success: true,

        checkoutUrl:
          response.data
            .data
            .checkoutUrl,

        qrCode:
          response.data
            .data
            .qrCode,
      });

    } catch (err) {

      console.error(
        "CREATE PAYMENT ERROR =>",
        err.response?.data ||
          err.message
      );

      return res.status(500).json({
        success: false,

        message:
          err.response?.data ||
          err.message,
      });
    }
  };

// =====================================================
// WEBHOOK
// =====================================================

const paymentWebhook =
  async (req, res) => {

    try {

      console.log(
        "WEBHOOK BODY =>",
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      const body =
        req.body;

      const data =
        body.data;

      // =====================================================
      // NO DATA
      // =====================================================

      if (!data) {

        console.log(
          "NO DATA"
        );

        return res.send("OK");
      }

      // =====================================================
      // LOG
      // =====================================================

      console.log(
        "PAYOS CODE =>",
        body.code
      );

      console.log(
        "PAYOS DESC =>",
        body.desc
      );

      console.log(
        "PAYOS STATUS =>",
        data.status
      );

      // =====================================================
      // CHECK SUCCESS
      // =====================================================

      const isPaid =
        body.code === "00" ||
        body.desc ===
          "success" ||
        data.status ===
          "PAID" ||
        data.status ===
          "SUCCESS";

      if (!isPaid) {

        console.log(
          "PAYMENT STILL PENDING"
        );

        return res.send("OK");
      }

      // =====================================================
      // ORDER CODE
      // =====================================================

      const orderCode =
        data.orderCode;

      console.log(
        "ORDER CODE =>",
        orderCode
      );

      // =====================================================
      // TRANSACTION
      // =====================================================

      const transaction =
        await sequelize.transaction();

      try {

        // =====================================================
        // FIND BOOKING + LOCK
        // =====================================================

        const booking =
          await Booking.findByPk(
            orderCode,
            {
              transaction,

              lock:
                transaction
                  .LOCK
                  .UPDATE,
            }
          );

        console.log(
          "BOOKING =>",
          booking
        );

        // =====================================================
        // BOOKING NOT FOUND
        // =====================================================

        if (!booking) {

          await transaction.rollback();

          console.log(
            "BOOKING NOT FOUND"
          );

          return res.send("OK");
        }

       // =====================================================
// ALREADY PAID OR DEPOSIT PAID
// =====================================================

if (
  booking.payment_status ===
    "deposit_paid" ||
  booking.payment_status ===
    "paid"
) {

  await transaction.rollback();

  console.log(
    "ALREADY PROCESSED"
  );

  return res.send("OK");
}

        // =====================================================
        // UPDATE BOOKING
        // =====================================================

        // =====================================================
// FIND ALL BOOKINGS IN GROUP
// =====================================================

const groupBookings =
await Booking.findAll({

  where: {
    payment_group:
      booking.payment_group,
  },

  transaction,
});

// =====================================================
// CHECK EXPIRED HOLD
// =====================================================

const now = new Date();

const hasExpired =
  groupBookings.some(
    (b) =>
      !b.hold_until ||
      new Date(b.hold_until) < now
  );

if (hasExpired) {

  await transaction.rollback();

  console.log(
    "BOOKING EXPIRED - IGNORE PAYMENT"
  );

  return res.send("OK");
}

// KIỂM TRA BOOKING ĐÃ HỦY CHƯA
const hasCancelled =
  groupBookings.some(
    (b) =>
      b.status === "cancelled"
  );

if (hasCancelled) {

  await transaction.rollback();

  console.log(
    "BOOKING CANCELLED - IGNORE PAYMENT"
  );

  return res.send("OK");
}

console.log(
  "GROUP BOOKINGS =>",
  groupBookings.map((b) => ({
    id: b.id,
    payment_group:
      b.payment_group,
    status: b.status,
  })),
);

// =====================================================
// UPDATE ALL BOOKINGS
// =====================================================

for (const b of groupBookings) {

  if (
    b.payment_method ===
    "deposit"
  ) {

    b.payment_status =
      "deposit_paid";

  } else {

    b.payment_status =
      "paid";
  }

  b.status =
    "booked";

  b.hold_until =
    null;

  await b.save({
    transaction,
  });
}

        // =====================================================
        // INCREASE VOUCHER USED COUNT
        // =====================================================

        if (
          booking.voucher_code
        ) {

          for (const b of groupBookings) {

  if (b.voucher_code) {

    await voucherService
    .createUserVoucher({

      userId:
        b.userId,

      voucherCode:
        b.voucher_code,

      bookingId:
        b.id,

      transaction,
    });
  }
}
        }

        // =====================================================
        // COMMIT
        // =====================================================

        await transaction.commit();

        console.log(
          "✅ PAYMENT SUCCESS"
        );

// =====================================================
// REALTIME NOTIFICATION
// =====================================================

const io =
  req.app.get("io");

for (const b of groupBookings) {

  const notification =
    await notificationService
      .createNotification({

        userId:
          b.userId,

        title:
          "Thanh toán thành công",

        message:
          `Bạn đã đặt sân thành công lúc ${b.start_time}`,

        type:
          "booking",
      });

  io.to(
    `user_${b.userId}`
  ).emit(
    "new_notification",
    notification
  );
}

        if (
          global.emitBookedSlot
        ) {

          for (const b of groupBookings) {

            console.log(
  "EMIT SLOT =>",
  b.id,
  b.start_time,
  b.booking_date,
);

  global.emitBookedSlot(

    b.fieldId,

    b.start_time,

    b.booking_date,

    b.userId
  );
}
        }

        return res.send("OK");

      } catch (error) {

        await transaction.rollback();

        console.error(
          "PAYMENT TRANSACTION ERROR =>",
          error
        );

        return res.send("OK");
      }

    } catch (err) {

      console.error(
        "WEBHOOK ERROR =>",
        err
      );

      return res.send("OK");
    }
  };

  // =====================================================
// CANCEL PAYMENT
// =====================================================

const cancelPayment = async (
  req,
  res
) => {

  try {

    const {
      bookingIds,
    } = req.body;

    if (
      !bookingIds ||
      !Array.isArray(bookingIds)
    ) {

      return res.status(400).json({
        success: false,
        message:
          "bookingIds required",
      });
    }

    const bookings =
  await Booking.findAll({
    where: {
      id: {
        [Op.in]:
          bookingIds,
      },
    },
  });

for (const b of bookings) {

  b.status =
    "cancelled";

  b.payment_status =
    "cancelled";

  b.hold_until =
    null;

  await b.save();

  if (
    global.emitAvailableSlot
  ) {

console.log(
  "RELEASE SLOT =>",
  b.id,
  b.start_time,
);

    global.emitAvailableSlot(

      b.fieldId,

      b.start_time,

      b.booking_date,

      b.userId,
    );
  }
}

    return res.json({
      success: true,
    });

  } catch (e) {

    console.error(
      "CANCEL PAYMENT ERROR =>",
      e,
    );

    return res.status(500).json({
      success: false,
    });
  }
};

module.exports = {
  createPayment,
  paymentWebhook,
  cancelPayment,
};