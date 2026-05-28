const voucherService =
  require("../services/voucherService");

const voucher =
  require("../models/voucher");

// ================= VALIDATE =================

const validateVoucher =
  async (req, res) => {

    try {

      const {
        code,
        amount,
        userId,
      } = req.body;

      const result =
        await voucherService
          .validateVoucher({

            code,
            amount,
            userId,
          });

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.log(
        "VOUCHER ERROR:"
      );

      console.log(error);

      return res
        .status(500)
        .json({

          message:
          error.message,

          error,
        });
    }
  };

// ================= GET ALL =================

const getVouchers =
  async (req, res) => {

    try {

      const vouchers =
        await voucher.findAll({

          where: {
            isActive: true,
          },

          order: [
            ["createdAt", "DESC"],
          ],
        });

      return res
        .status(200)
        .json(vouchers);

    } catch (error) {

      console.log(
        "GET VOUCHERS ERROR:"
      );

      console.log(error);

      return res
        .status(500)
        .json({

          message:
          "Lỗi lấy voucher",

          error,
        });
    }
  };

module.exports = {

  validateVoucher,

  getVouchers,
};