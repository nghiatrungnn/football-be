const payos = require("../services/payosService");

const {
  booking: Booking,
} = require("../models");

const createPayment =
  async (req, res) => {
    try {
      const {
        bookingId,
        amount,
      } = req.body;

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

      const orderCode =
        Number(
          `${Date.now()}`
            .slice(-6)
        );

      const paymentData = {
        orderCode,

        amount,

        description:
          `Dat san ${booking.id}`,

        returnUrl:
          "https://google.com",

        cancelUrl:
          "https://google.com",
      };

      const paymentLink =
        await payos.createPaymentLink(
          paymentData
        );

      booking.transaction_code =
        orderCode.toString();

      await booking.save();

      return res.json({
        success: true,

        checkoutUrl:
          paymentLink.checkoutUrl,

        qrCode:
          paymentLink.qrCode,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
  const paymentWebhook =
  async (req, res) => {
    try {
      const data =
        req.body.data;

      const orderCode =
        data.orderCode;

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

      return res.send("OK");
    } catch (err) {
      console.error(err);

      return res.send("OK");
    }
  };

module.exports = {
  createPayment,
  paymentWebhook,
};