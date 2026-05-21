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
      } = req.body;

      // ================= FIND BOOKING =================

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

      // ================= ORDER CODE =================

      const orderCode =
        Number(
          Date.now()
            .toString()
            .slice(-6)
        );

      // =====================================================
      // PAYOS BODY
      // =====================================================

      const body = {
        orderCode,

        amount:
          Number(amount),

        description:
          `Dat san ${booking.id}`,

        returnUrl:
          "https://google.com",

        cancelUrl:
          "https://google.com",
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
      // API REQUEST
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

      // ================= SAVE TRANSACTION =================

      booking.transaction_code =
        orderCode.toString();

      await booking.save();

      // =====================================================
      // RESPONSE
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
        "WEBHOOK =>",
        req.body
      );

      const data =
        req.body.data;

      if (!data) {
        return res.send("OK");
      }

      const orderCode =
        data.orderCode;

      // ================= FIND BOOKING =================

      const booking =
        await Booking.findOne({
          where: {
            transaction_code:
              orderCode.toString(),
          },
        });

      if (!booking) {
        return res.send("OK");
      }

      // ================= UPDATE =================

      booking.payment_status =
        "paid";

      booking.status =
        "booked";

      booking.hold_until =
        null;

      await booking.save();

      console.log(
        "✅ PAYMENT SUCCESS"
      );

      // ================= REALTIME =================

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