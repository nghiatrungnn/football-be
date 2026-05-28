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

  // ================= CREATE =================

const createVoucher = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minAmount,
      maxDiscount,
      usageLimit,
      startDate,
      endDate,
      isActive,
      isOneTimePerUser,
    } = req.body;

    // check trùng code
    const existingVoucher = await voucher.findOne({
      where: { code },
    });

    if (existingVoucher) {
      return res.status(400).json({
        message: "Mã voucher đã tồn tại",
      });
    }

    const newVoucher = await voucher.create({
      code,
      type,
      value,
      minAmount,
      maxDiscount,
      usageLimit,
      startDate,
      endDate,
      isActive,
      isOneTimePerUser,
    });

    return res.status(201).json({
      message: "Tạo voucher thành công",
      voucher: newVoucher,
    });
  } catch (error) {
    console.log("CREATE VOUCHER ERROR:");
    console.log(error);

    return res.status(500).json({
      message: "Lỗi tạo voucher",
      error,
    });
  }
};

// ================= UPDATE =================

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const foundVoucher = await voucher.findByPk(id);

    if (!foundVoucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher",
      });
    }

    await foundVoucher.update(req.body);

    return res.status(200).json({
      message: "Cập nhật voucher thành công",
      voucher: foundVoucher,
    });
  } catch (error) {
    console.log("UPDATE VOUCHER ERROR:");
    console.log(error);

    return res.status(500).json({
      message: "Lỗi cập nhật voucher",
      error,
    });
  }
};

// ================= DELETE =================

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const foundVoucher = await voucher.findByPk(id);

    if (!foundVoucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher",
      });
    }

    await foundVoucher.destroy();

    return res.status(200).json({
      message: "Xóa voucher thành công",
    });
  } catch (error) {
    console.log("DELETE VOUCHER ERROR:");
    console.log(error);

    return res.status(500).json({
      message: "Lỗi xóa voucher",
      error,
    });
  }
};

// ================= GET ONE =================

const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;

    const foundVoucher = await voucher.findByPk(id);

    if (!foundVoucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher",
      });
    }

    return res.status(200).json(foundVoucher);
  } catch (error) {
    console.log("GET VOUCHER DETAIL ERROR:");
    console.log(error);

    return res.status(500).json({
      message: "Lỗi lấy chi tiết voucher",
      error,
    });
  }
};

module.exports = {
  validateVoucher,
  getVouchers,

  createVoucher,
  updateVoucher,
  deleteVoucher,
  getVoucherById,
};