const axios =
  require("axios");

const crypto =
  require("crypto");

const {
  booking: Booking,
} = require("../models");

// =====================================================
// CREATE PAYMENT
// =====================================================

const createPayment =
  async (req, res) => {
    try {

      const {
        bookingId,
        amount,
        platform,
      } = req.body;

      // =====================================================
      // FIND BOOKING
      // =====================================================

      const booking =
        await Booking.findByPk(
          bookingId
        );

      if (!booking) {

        return res.status(404).json({
          success: false,
          message:
            "Booking not found",
        });
      }

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

      const orderCode =
        Number(
          Date.now()
            .toString()
            .slice(-6)
        );

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
          `Dat san ${booking.id}`,

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

      // =====================================================
      // FIND BOOKING
      // =====================================================

      const booking =
        await Booking.findOne({
          where: {
            transaction_code:
              orderCode.toString(),
          },
        });

      if (!booking) {

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

        console.log(
          "ALREADY PAID"
        );

        return res.send("OK");
      }

      // =====================================================
      // UPDATE DB
      // =====================================================

      booking.payment_status =
        "paid";

      booking.status =
  "paid";

      booking.hold_until =
        null;

      await booking.save();

      console.log(
        "✅ PAYMENT SUCCESS"
      );

      // =====================================================
      // REALTIME
      // =====================================================

      if (
        global.emitBookedSlot
      ) {

        global.emitBookedSlot(
          booking.fieldId,
          booking.start_time,
          booking.booking_date,
          booking.userId
        );
      }

      return res.send("OK");

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