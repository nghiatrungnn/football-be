const voucher =
  require("../models/voucher");

const userVoucher =
  require("../models/userVoucher");

// =====================================================
// VALIDATE VOUCHER
// =====================================================

const validateVoucher =
  async ({
    code,
    amount,
    userId,
    transaction,
  }) => {

    // =====================================================
    // FIND + LOCK
    // =====================================================

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
    // NOT FOUND
    // =====================================================

    if (!foundVoucher) {

      return {
        valid: false,

        message:
          "Voucher không tồn tại",
      };
    }

    // =====================================================
    // INACTIVE
    // =====================================================

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
    // NOT STARTED
    // =====================================================

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
    // EXPIRED
    // =====================================================

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
    // USAGE LIMIT
    // =====================================================

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
    // MIN AMOUNT
    // =====================================================

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
    // ONE TIME PER USER
    // =====================================================

    if (
      foundVoucher
        .isOneTimePerUser &&
      userId
    ) {

      const existed =
        await userVoucher.findOne({
          where: {
            userId,

            voucherId:
              foundVoucher.id,
          },

          transaction,
        });

      if (existed) {

        return {
          valid: false,

          message:
            "Bạn đã dùng voucher này",
        };
      }
    }

    // =====================================================
    // CALCULATE DISCOUNT
    // =====================================================

    let discount = 0;

    // =====================================================
    // PERCENT
    // =====================================================

    if (
      foundVoucher.type ===
      "percent"
    ) {

      discount =
        (amount *
          foundVoucher.value) /
        100;

      // =====================================================
      // MAX DISCOUNT
      // =====================================================

      if (
        foundVoucher.maxDiscount >
          0 &&
        discount >
          foundVoucher.maxDiscount
      ) {

        discount =
          foundVoucher.maxDiscount;
      }
    }

    // =====================================================
    // FIXED
    // =====================================================

    if (
      foundVoucher.type ===
      "fixed"
    ) {

      discount =
        foundVoucher.value;
    }

    // =====================================================
    // FINAL AMOUNT
    // =====================================================

    let finalAmount =
      amount - discount;

    // =====================================================
    // NO NEGATIVE
    // =====================================================

    if (finalAmount < 0) {

      finalAmount = 0;
    }

    // =====================================================
    // SUCCESS
    // =====================================================

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
// INCREASE USED COUNT
// =====================================================

const increaseVoucherUsedCount =
  async ({
    voucherCode,
    transaction,
  }) => {

    if (!voucherCode) return;

    const foundVoucher =
      await voucher.findOne({
        where: {
          code:
            voucherCode,
        },

        transaction,

        lock:
          transaction?.LOCK
            ?.UPDATE,
      });

    if (!foundVoucher)
      return;

    foundVoucher.usedCount += 1;

    await foundVoucher.save({
      transaction,
    });
  };

// =====================================================
// CREATE USER VOUCHER HISTORY
// =====================================================

const createUserVoucher =
  async ({
    userId,
    voucherCode,
    bookingId,
    transaction,
  }) => {

    if (!voucherCode)
      return;

    const foundVoucher =
      await voucher.findOne({
        where: {
          code:
            voucherCode,
        },

        transaction,
      });

    if (!foundVoucher)
      return;

    await userVoucher.create(
      {
        userId,

        voucherId:
          foundVoucher.id,

        bookingId,
      },

      {
        transaction,
      }
    );
  };

module.exports = {

  validateVoucher,

  increaseVoucherUsedCount,

  createUserVoucher,
};