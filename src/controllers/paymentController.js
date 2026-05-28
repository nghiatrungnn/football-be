const axios =
  require("axios");

const crypto =
  require("crypto");

const { sequelize } =
  require("../models");

const voucherService =
  require("../services/voucherService");

  
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

      // =====================================================
      // FIND BOOKING
      // =====================================================

      const bookings =
await Booking.findAll({

  where: {
    id: bookingIds,
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
      // ALREADY PAID
      // =====================================================

      if (
        booking.payment_status ===
        "paid"
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
      // SAVE DB
      // =====================================================

      booking.transaction_code =
        orderCode.toString();

      booking.payment_status =
        "pending";

      booking.status =
        "holding";

      await booking.save();

      // =====================================================
      // RETURN URL
      // =====================================================

      const returnUrl =
        platform === "web"
          ? "http://localhost:3000"
          : "http://localhost:3000/#/home";

      const cancelUrl =
        platform === "web"
          ? "http://localhost:3000"
          : "http://localhost:3000/#/home";

      // =====================================================
      // BODY
      // =====================================================

      const body = {
        orderCode,

        amount:
          Number(amount),

        description:
  `Ten:${booking.user.name} Dat San:${booking.field.name}`.slice(0, 25),

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

      // =====================================================
// SAVE PAYMENT LINK ID
// =====================================================

booking.payment_link_id =
  response.data
    .data
    .paymentLinkId;

await booking.save();

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
        // ALREADY PAID
        // =====================================================

        if (
          booking.payment_status ===
          "paid"
        ) {

          await transaction.rollback();

          console.log(
            "ALREADY PAID"
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
// UPDATE ALL BOOKINGS
// =====================================================

for (const b of groupBookings) {

  b.payment_status =
    "paid";

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
        // REALTIME
        // =====================================================

        if (
          global.emitBookedSlot
        ) {

          for (const b of groupBookings) {

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

module.exports = {
  createPayment,
  paymentWebhook,
};