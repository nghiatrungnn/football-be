const voucherService =
  require("../services/voucherService");

const voucher =
  require("../models/voucher");


// =====================================================
// VALIDATE VOUCHER
// =====================================================
//
// Chức năng:
//
// Kiểm tra voucher có hợp lệ không.
//
// Frontend gửi:
//
// code
// amount
// userId
//
// Backend sẽ:
//
// - kiểm tra voucher tồn tại
// - kiểm tra thời gian hiệu lực
// - kiểm tra số lần sử dụng
// - kiểm tra giá trị đơn hàng tối thiểu
// - tính số tiền được giảm
//
const validateVoucher =

  async (

    req,

    res

  ) => {

    try {

      const {

        code,

        amount,

        userId,

      } = req.body;


      // =====================================================
      // GỌI SERVICE VALIDATE
      // =====================================================
      //
      // Logic voucher nằm trong service.
      //
      const result =

        await voucherService

          .validateVoucher({

            code,

            amount,

            userId,

          });


      // =====================================================
      // TRẢ KẾT QUẢ
      // =====================================================
      //
      return res

        .status(200)

        .json(

          result

        );

    } catch (error) {

      console.log(

        "VOUCHER ERROR:"

      );

      console.log(

        error

      );


      return res

        .status(500)

        .json({

          message:

            error.message,

          error,

        });
    }
  };


// =====================================================
// GET ALL VOUCHERS
// =====================================================
//
// Chức năng:
//
// Lấy tất cả voucher đang hoạt động.
//
const getVouchers =

  async (

    req,

    res

  ) => {

    try {

      const vouchers =

        await voucher.findAll({

          where: {

            isActive:

              true,

          },

          order: [

            [

              "createdAt",

              "DESC",

            ],

          ],

        });


      return res
  .status(200)
  .json(
    vouchers.map((v) => ({
      ...v.toJSON(),

      remainingUses:
        v.usageLimit -
        v.usedCount,
    }))
  );

    } catch (error) {

      console.log(

        "GET VOUCHERS ERROR:"

      );

      console.log(

        error

      );


      return res

        .status(500)

        .json({

          message:

            "Lỗi lấy voucher",

          error,

        });
    }
  };


// =====================================================
// CREATE VOUCHER
// =====================================================
//
// Chức năng:
//
// Admin tạo voucher mới.
//
const createVoucher =

  async (

    req,

    res

  ) => {

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


      // =====================================================
      // KIỂM TRA CODE TRÙNG
      // =====================================================
      //
      const existingVoucher =

        await voucher.findOne({

          where: {

            code,

          },

        });


      if (

        existingVoucher

      ) {

        return res.status(400)

          .json({

            message:

              "Mã voucher đã tồn tại",

          });
      }


      // =====================================================
      // TẠO VOUCHER
      // =====================================================
      //
      const newVoucher =

        await voucher.create({

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


      return res.status(201)

        .json({

          message:

            "Tạo voucher thành công",

          voucher:

            newVoucher,

        });

    } catch (error) {

      console.log(

        "CREATE VOUCHER ERROR:"

      );

      console.log(

        error

      );


      return res.status(500)

        .json({

          message:

            "Lỗi tạo voucher",

          error,

        });
    }
  };


// =====================================================
// UPDATE VOUCHER
// =====================================================
//
// Chức năng:
//
// Admin cập nhật voucher.
//
const updateVoucher =

  async (

    req,

    res

  ) => {

    try {

      const {

        id,

      } = req.params;


      const foundVoucher =

        await voucher.findByPk(

          id

        );


      if (

        !foundVoucher

      ) {

        return res.status(404)

          .json({

            message:

              "Không tìm thấy voucher",

          });
      }


      // =====================================================
      // CẬP NHẬT VOUCHER
      // =====================================================
      //
      await foundVoucher.update(

        req.body

      );


      return res.status(200)

        .json({

          message:

            "Cập nhật voucher thành công",

          voucher:

            foundVoucher,

        });

    } catch (error) {

      console.log(

        "UPDATE VOUCHER ERROR:"

      );

      console.log(

        error

      );


      return res.status(500)

        .json({

          message:

            "Lỗi cập nhật voucher",

          error,

        });
    }
  };


// =====================================================
// DELETE VOUCHER
// =====================================================
//
// Chức năng:
//
// Admin xóa voucher.
//
const deleteVoucher =

  async (

    req,

    res

  ) => {

    try {

      const {

        id,

      } = req.params;


      const foundVoucher =

        await voucher.findByPk(

          id

        );


      if (

        !foundVoucher

      ) {

        return res.status(404)

          .json({

            message:

              "Không tìm thấy voucher",

          });
      }


      await foundVoucher.destroy();


      return res.status(200)

        .json({

          message:

            "Xóa voucher thành công",

        });

    } catch (error) {

      console.log(

        "DELETE VOUCHER ERROR:"

      );

      console.log(

        error

      );


      return res.status(500)

        .json({

          message:

            "Lỗi xóa voucher",

          error,

        });
    }
  };


// =====================================================
// GET VOUCHER DETAIL
// =====================================================
//
// Chức năng:
//
// Lấy chi tiết một voucher.
//
const getVoucherById =

  async (

    req,

    res

  ) => {

    try {

      const {

        id,

      } = req.params;


      const foundVoucher =

        await voucher.findByPk(

          id

        );


      if (

        !foundVoucher

      ) {

        return res.status(404)

          .json({

            message:

              "Không tìm thấy voucher",

          });
      }


      return res.status(200)

        .json(

          foundVoucher

        );

    } catch (error) {

      console.log(

        "GET VOUCHER DETAIL ERROR:"

      );

      console.log(

        error

      );


      return res.status(500)

        .json({

          message:

            "Lỗi lấy chi tiết voucher",

          error,

        });
    }
  };


// =====================================================
// EXPORT
// =====================================================
//
// validateVoucher:
// kiểm tra voucher.
//
// getVouchers:
// lấy danh sách voucher.
//
// createVoucher:
// tạo voucher.
//
// updateVoucher:
// cập nhật voucher.
//
// deleteVoucher:
// xóa voucher.
//
// getVoucherById:
// lấy chi tiết voucher.
//
module.exports = {

  validateVoucher,

  getVouchers,

  createVoucher,

  updateVoucher,

  deleteVoucher,

  getVoucherById,

};