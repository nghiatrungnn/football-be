const voucher =
  require("../models/voucher");

const userVoucher =
  require("../models/userVoucher");

// =====================================================
// VALIDATE VOUCHER
// =====================================================
//
// Chức năng:
//
// Kiểm tra voucher có hợp lệ không.
//
// Trả về:
//
// valid
// message
// discount
// finalAmount
//
const validateVoucher =

  async ({

    code,

    amount,

    userId,

    transaction,

  }) => {


    // =====================================================
    // TÌM VOUCHER + KHÓA DỮ LIỆU
    // =====================================================
    //
    // lock UPDATE:
    //
    // tránh nhiều người dùng
    // voucher cùng lúc gây sai usedCount.
    //
    const foundVoucher =

      await voucher.findOne({

        where: {

          code,

        },

        transaction,

        lock:

          transaction?.LOCK

            ?.UPDATE,

      });


    // =====================================================
    // KHÔNG TỒN TẠI
    // =====================================================
    //
    if (

      !foundVoucher

    ) {

      return {

        valid: false,

        message:

          "Voucher không tồn tại",

      };
    }


    // =====================================================
    // VOUCHER BỊ KHÓA
    // =====================================================
    //
    if (

      !foundVoucher.isActive

    ) {

      return {

        valid: false,

        message:

          "Voucher đã bị khóa",

      };
    }


    const now =

      new Date();


    // =====================================================
    // CHƯA ĐẾN NGÀY SỬ DỤNG
    // =====================================================
    //
    if (

      now <

      foundVoucher.startDate

    ) {

      return {

        valid: false,

        message:

          "Voucher chưa bắt đầu",

      };
    }


    // =====================================================
    // HẾT HẠN
    // =====================================================
    //
    if (

      now >

      foundVoucher.endDate

    ) {

      return {

        valid: false,

        message:

          "Voucher đã hết hạn",

      };
    }


    // =====================================================
    // HẾT LƯỢT SỬ DỤNG
    // =====================================================
    //
    if (

      foundVoucher.usedCount >=

      foundVoucher.usageLimit

    ) {

      return {

        valid: false,

        message:

          "Voucher đã hết lượt sử dụng",

      };
    }


    // =====================================================
    // KIỂM TRA GIÁ TRỊ ĐƠN HÀNG
    // =====================================================
    //
    if (

      amount <

      foundVoucher.minAmount

    ) {

      return {

        valid: false,

        message:

          `Đơn tối thiểu ${foundVoucher.minAmount}`,

      };
    }


    // =====================================================
    // MỖI USER CHỈ DÙNG 1 LẦN
    // =====================================================
    //
   if (foundVoucher.isOneTimePerUser) {

  const usedVoucher =
    await userVoucher.findOne({

      where: {

        userId,

        voucherId:
          foundVoucher.id,

      },

      transaction,

    });

  if (usedVoucher) {

    return {

      valid: false,

      message:
        "Bạn đã dùng voucher này",

    };
  }
}
    // =====================================================
    // TÍNH GIẢM GIÁ
    // =====================================================
    //
    let discount = 0;


    // =====================================================
    // GIẢM THEO %
    // =====================================================
    //
    if (

      foundVoucher.type ===

      "percent"

    ) {

      discount =

        (

          amount *

          foundVoucher.value

        ) / 100;


      // =====================================================
      // GIẢM TỐI ĐA
      // =====================================================
      //
      if (

        foundVoucher.maxDiscount > 0 &&

        discount >

        foundVoucher.maxDiscount

      ) {

        discount =

          foundVoucher.maxDiscount;
      }
    }


    // =====================================================
    // GIẢM THEO TIỀN CỐ ĐỊNH
    // =====================================================
    //
    if (

      foundVoucher.type ===

      "fixed"

    ) {

      discount =

        foundVoucher.value;
    }


    // =====================================================
    // TÍNH TIỀN CUỐI CÙNG
    // =====================================================
    //
    let finalAmount =

      amount -

      discount;


    // =====================================================
    // KHÔNG ÂM
    // =====================================================
    //
    if (

      finalAmount < 0

    ) {

      finalAmount = 0;
    }


    // =====================================================
    // THÀNH CÔNG
    // =====================================================
    //
    return {

      valid: true,

      message:

        "Áp dụng voucher thành công",

      discount,

      finalAmount,

      voucher:

        foundVoucher,

    };
  };

// =====================================================
// TĂNG SỐ LƯỢT DÙNG VOUCHER
// =====================================================

const increaseVoucherUsedCount = async ({

  voucherId,

  transaction,

}) => {

  if (
  firstBooking &&
  firstBooking.voucher_code
) {

  const foundVoucher =
    await voucher.findOne({
      where: {
        code:
          firstBooking.voucher_code,
      },
      transaction,
    });

  if (foundVoucher) {

    const [usedVoucher, created] =
      await userVoucher.findOrCreate({

        where: {
          userId:
            firstBooking.userId,

          voucherId:
            foundVoucher.id,
        },

        defaults: {
          bookingId:
            firstBooking.id,
        },

        transaction,
      });

    if (created) {

      await voucher.increment(
        {
          usedCount: 1,
        },
        {
          where: {
            id:
              foundVoucher.id,
          },
          transaction,
        }
      );
    }
  }
}

};

// =====================================================
// LƯU LỊCH SỬ USER DÙNG VOUCHER
// =====================================================
//
// Dùng để:
//
// kiểm tra OneTimePerUser.
//
const createUserVoucher =

  async ({

    userId,

    voucherCode,

    bookingId,

    transaction,

  }) => {

    if (

      !voucherCode

    ) return;


    const foundVoucher =

      await voucher.findOne({

        where: {

          code:

            voucherCode,

        },

        transaction,

      });


    if (

      !foundVoucher

    ) return;


    await userVoucher.findOrCreate({
  where: {
    userId,
    voucherId: foundVoucher.id,
  },
  defaults: {
    bookingId,
  },
  transaction,
});
  };


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  validateVoucher,

  increaseVoucherUsedCount,

  createUserVoucher,

};