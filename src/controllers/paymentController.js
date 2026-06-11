// =====================================================
// IMPORT THƯ VIỆN
// =====================================================

// axios:
// Dùng để gọi API ra bên ngoài.
// Trong file này dùng để gọi API PayOS.
const axios =
  require("axios");

// crypto:
// Dùng để tạo chữ ký (signature)
// giúp PayOS xác thực request.
const crypto =
  require("crypto");

// sequelize:
// Dùng transaction để rollback nếu lỗi.
const { sequelize } =
  require("../models");

// voucherService:
// Xử lý voucher sau khi thanh toán thành công.
const voucherService =
  require("../services/voucherService");

// notificationService:
// Tạo thông báo cho user.
const notificationService =
  require(
    "../services/notificationService"
  );

// Op:
// Các toán tử Sequelize như:
// Op.in, Op.like,...
const { Op } =
  require("sequelize");

// Import models
const {
  booking: Booking,
  user: User,
  field: Field,
} = require("../models");


// =====================================================
// CREATE PAYMENT
// =====================================================
//
// Chức năng:
//
// 1. Nhận bookingIds từ frontend.
// 2. Kiểm tra booking hợp lệ.
// 3. Đưa booking sang trạng thái holding.
// 4. Tạo link thanh toán PayOS.
// 5. Trả QR Code và checkoutUrl.
//
const createPayment =
  async (req, res) => {

    try {

      // =====================================================
      // LẤY DỮ LIỆU TỪ FRONTEND
      // =====================================================
      //
      // bookingIds:
      // danh sách booking cần thanh toán.
      //
      // amount:
      // frontend gửi lên nhưng hiện tại
      // backend tự tính lại.
      //
      // platform:
      // web hoặc mobile.
      //
      const {

        bookingIds,

        amount,

        platform,

      } = req.body;

      console.log(

        "BOOKING IDS =>",

        bookingIds

      );

      // =====================================================
      // KIỂM TRA bookingIds
      // =====================================================
      //
      // bookingIds phải:
      //
      // - tồn tại
      // - là mảng
      // - không được rỗng
      //
      if (

        !bookingIds ||

        !Array.isArray(
          bookingIds
        ) ||

        bookingIds.length === 0

      ) {

        return res.status(400).json({

          success: false,

          message:
            "bookingIds invalid",

        });
      }

      // =====================================================
      // TÌM CÁC BOOKING CẦN THANH TOÁN
      // =====================================================
      //
      // WHERE id IN (...)
      //
      // include:
      //
      // User.name
      // Field.name
      //
      // để dùng tạo mô tả thanh toán.
      //
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

              attributes: [
                "name"
              ],

            },

            {

              model: Field,

              attributes: [
                "name"
              ],

            },

          ],

        });

        console.log(
  "BOOKINGS BEFORE PAYOS =>",
  bookings.map((b) => ({
    id: b.id,
    total_price: b.total_price,
    discount_amount: b.discount_amount,
    final_amount: b.final_amount,
    deposit_amount: b.deposit_amount,
    voucher_code: b.voucher_code,
  }))
);

      // =====================================================
      // KHÔNG TÌM THẤY BOOKING
      // =====================================================
      //
      // Nếu không có booking nào
      // thì trả về 404.
      //
      if (
        !bookings.length
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Booking not found",

        });
      }

      // =====================================================
      // LẤY BOOKING ĐẦU TIÊN
      // =====================================================
      //
      // Booking đầu tiên được dùng để:
      //
      // - lấy orderCode
      // - lấy payment_group
      // - lấy user
      // - lấy field
      //
      const booking =
        bookings[0];

      // =====================================================
      // KIỂM TRA PAYMENT GROUP
      // =====================================================
      //
      // payment_group dùng để nhóm
      // nhiều booking lại thành
      // một giao dịch.
      //
      // Ví dụ:
      //
      // booking 1 → 18h
      // booking 2 → 19h
      //
      // cùng payment_group.
      //
      const paymentGroup =

        booking.payment_group;

      if (
        !paymentGroup
      ) {

        return res.status(400).json({

          success: false,

          message:
            "payment_group missing",

        });
      }
            // =====================================================
      // KIỂM TRA BOOKING ĐÃ THANH TOÁN CHƯA
      // =====================================================
      //
      // Nếu booking đã:
      //
      // paid
      // hoặc
      // deposit_paid
      //
      // thì không được tạo link thanh toán mới.
      //
      // Tránh thanh toán trùng.
      //
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
      // TẠO ORDER CODE
      // =====================================================
      //
      // Sử dụng id của booking đầu tiên
      // làm mã đơn hàng.
      //
      const orderCode =
        booking.id;

      // =====================================================
      // CẬP NHẬT TẤT CẢ BOOKING TRONG NHÓM
      // =====================================================
      //
      // transaction_code:
      // mã giao dịch.
      //
      // payment_status:
      // pending → đang chờ thanh toán.
      //
      // status:
      // holding → giữ chỗ.
      //
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
      // XÁC ĐỊNH RETURN URL
      // =====================================================
      //
      // WEB:
      // quay về website.
      //
      // MOBILE:
      // sử dụng deep link.
      //
      console.log(

        "PLATFORM =>",

        platform

      );

      const returnUrl =
  platform === "web"
    ? "https://datn-w9iy-git-main-hoang-tu-s-projects.vercel.app/"
    : `footballbooking://payment-success?orderCode=${orderCode}`;

const cancelUrl =
  platform === "web"
    ? "https://datn-w9iy-git-main-hoang-tu-s-projects.vercel.app/"
    : `footballbooking://payment-cancel?orderCode=${orderCode}`;

      // =====================================================
      // TẠO BODY GỬI PAYO
      // =====================================================
      //
      // orderCode:
      // mã đơn hàng.
      //
      // amount:
      // tổng tiền cọc.
      //
      // description:
      // mô tả giao dịch.
      //
      let payosAmount;

if (booking.payment_method === "deposit") {
  payosAmount = bookings.reduce(
    (sum, b) => sum + (b.deposit_amount || 0),
    0
  );
} else {
  payosAmount = amount;
}

console.log(
  "FRONTEND AMOUNT =>",
  amount
);

console.log(
  "PAYOS AMOUNT =>",
  payosAmount
);

console.log(
  "PAYMENT METHOD =>",
  booking.payment_method
);

  console.log(
  "BOOKINGS BEFORE PAYOS =>",
  bookings.map((b) => ({
    id: b.id,
    total_price: b.total_price,
    discount_amount: b.discount_amount,
    final_amount: b.final_amount,
    deposit_amount: b.deposit_amount,
    voucher_code: b.voucher_code,
  }))
);

console.log(
  "PAYOS AMOUNT =>",
  payosAmount
);

console.log(
  "PAYOS AMOUNT =>",
  payosAmount
);

const body = {
  orderCode,
  amount: payosAmount,
  description:
    `Ten:${booking.user.name}San:${booking.field.name}`.slice(
      0,
      25
    ),
  returnUrl,
  cancelUrl,
};

      // =====================================================
      // TẠO CHỮ KÝ BẢO MẬT
      // =====================================================
      //
      // PayOS yêu cầu signature.
      //
      // Signature được tạo bằng:
      //
      // HMAC SHA256
      //
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

          .digest(

            "hex"

          );

      // =====================================================
      // GỌI API PAYOS
      // =====================================================
      //
      // Tạo link thanh toán.
      //
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
      // KIỂM TRA PAYOS CÓ TRẢ DỮ LIỆU KHÔNG
      // =====================================================
      //
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

      // =====================================================
      // LƯU paymentLinkId
      // =====================================================
      //
      // paymentLinkId dùng để
      // đối chiếu giao dịch.
      //
      for (const b of bookings) {

        b.payment_link_id =

          response.data
            .data
            .paymentLinkId;

        await b.save();
      }

      // =====================================================
      // TRẢ DỮ LIỆU VỀ FRONTEND
      // =====================================================
      //
      // checkoutUrl:
      // link chuyển sang PayOS.
      //
      // qrCode:
      // QR để người dùng quét.
      //
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

      // =====================================================
      // XỬ LÝ LỖI
      // =====================================================
      //
      // Nếu PayOS lỗi hoặc server lỗi
      // sẽ vào đây.
      //
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
//
// PayOS sẽ gọi API này khi:
//
// - Thanh toán thành công
// - Thanh toán thất bại
//
// Đây là nơi QUAN TRỌNG NHẤT.
//
// Vì frontend có thể bị tắt,
// nhưng webhook vẫn đảm bảo dữ liệu đúng.
//
const paymentWebhook =
  async (req, res) => {

    try {

      // =====================================================
      // LOG DỮ LIỆU PAYOS GỬI VỀ
      // =====================================================
      //
      // In toàn bộ body để debug.
      //
      console.log(

        "WEBHOOK BODY =>",

        JSON.stringify(

          req.body,

          null,

          2

        )

      );

      // =====================================================
      // LẤY BODY VÀ DATA
      // =====================================================
      //
      // body:
      // dữ liệu webhook.
      //
      // data:
      // thông tin thanh toán.
      //
      const body =

        req.body;

      const data =

        body.data;

      // =====================================================
      // KHÔNG CÓ DATA
      // =====================================================
      //
      // PayOS đôi khi gửi request
      // kiểm tra kết nối.
      //
      // Không có data thì bỏ qua.
      //
      if (!data) {

        console.log(

          "NO DATA"

        );

        return res.send("OK");
      }

      // =====================================================
      // LOG THÔNG TIN THANH TOÁN
      // =====================================================
      //
      // code:
      // mã phản hồi từ PayOS.
      //
      // desc:
      // mô tả trạng thái.
      //
      // status:
      // trạng thái giao dịch.
      //
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
      // KIỂM TRA THANH TOÁN THÀNH CÔNG
      // =====================================================
      //
      // Thành công nếu:
      //
      // code = "00"
      //
      // hoặc
      //
      // desc = "success"
      //
      // hoặc
      //
      // status = "PAID"
      //
      // hoặc
      //
      // status = "SUCCESS"
      //
      const isPaid =

        body.code === "00" ||

        body.desc ===
          "success" ||

        data.status ===
          "PAID" ||

        data.status ===
          "SUCCESS";

      // =====================================================
      // CHƯA THANH TOÁN
      // =====================================================
      //
      // Nếu chưa thành công thì
      // dừng xử lý.
      //
      if (!isPaid) {

        console.log(

          "PAYMENT STILL PENDING"

        );

        return res.send("OK");
      }

      // =====================================================
      // LẤY ORDER CODE
      // =====================================================
      //
      // orderCode chính là
      // booking.id đã gửi sang PayOS.
      //
      const orderCode =

        data.orderCode;

      console.log(

        "ORDER CODE =>",

        orderCode

      );

      // =====================================================
      // BẮT ĐẦU TRANSACTION
      // =====================================================
      //
      // Nếu có lỗi:
      //
      // rollback()
      //
      // Nếu thành công:
      //
      // commit()
      //
      const transaction =

        await sequelize.transaction();

      try {

        // =====================================================
        // TÌM BOOKING VÀ KHÓA DÒNG
        // =====================================================
        //
        // lock UPDATE:
        //
        // tránh nhiều webhook
        // xử lý cùng lúc.
        //
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
        // KHÔNG TÌM THẤY BOOKING
        // =====================================================
        //
        // rollback transaction.
        //
        if (!booking) {

          await transaction.rollback();

          console.log(

            "BOOKING NOT FOUND"

          );

          return res.send("OK");
        }

        // =====================================================
        // ĐÃ XỬ LÝ TRƯỚC ĐÓ
        // =====================================================
        //
        // Nếu booking đã:
        //
        // deposit_paid
        //
        // hoặc
        //
        // paid
        //
        // thì webhook này bị trùng.
        //
        // Không xử lý lại.
        //
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
        // TÌM TẤT CẢ BOOKING TRONG CÙNG PAYMENT GROUP
        // =====================================================
        //
        // Khi người dùng thanh toán nhiều slot
        // trong cùng một lần thanh toán,
        // tất cả booking sẽ có chung payment_group.
        //
        // Ví dụ:
        //
        // Booking 101 → 18:00
        // Booking 102 → 19:00
        //
        // payment_group = "PAY_123"
        //
        // Khi PayOS báo thanh toán thành công:
        // → cập nhật tất cả booking trong nhóm.
        //
        const groupBookings =

          await Booking.findAll({

            where: {

              payment_group:

                booking.payment_group,

            },

            transaction,

          });

        // =====================================================
        // KIỂM TRA GIỮ CHỖ ĐÃ HẾT HẠN CHƯA
        // =====================================================
        //
        // hold_until:
        // thời gian giữ sân.
        //
        // Nếu người dùng thanh toán quá muộn,
        // booking sẽ hết hiệu lực.
        //
        const now =

          new Date();

        const hasExpired =

          groupBookings.some(

            (b) =>

              !b.hold_until ||

              new Date(
                b.hold_until
              ) < now

          );

        // =====================================================
        // BOOKING HẾT HẠN
        // =====================================================
        //
        // rollback transaction
        // và bỏ qua webhook.
        //
        if (hasExpired) {
  console.log(
    "BOOKING EXPIRED BUT PAYMENT SUCCESS"
  );
}

        // =====================================================
        // KIỂM TRA BOOKING ĐÃ BỊ HỦY CHƯA
        // =====================================================
        //
        // Nếu một booking trong nhóm
        // đã bị hủy thì không xử lý.
        //
        const hasCancelled =

          groupBookings.some(

            (b) =>

              b.status ===
                "cancelled"

          );

        // =====================================================
        // BOOKING ĐÃ HỦY
        // =====================================================
        //
        // rollback transaction.
        //
        if (hasCancelled) {

          await transaction.rollback();

          console.log(

            "BOOKING CANCELLED - IGNORE PAYMENT"

          );

          return res.send("OK");
        }

        // =====================================================
        // LOG DANH SÁCH BOOKING TRONG NHÓM
        // =====================================================
        //
        // Dùng để debug.
        //
        console.log(

          "GROUP BOOKINGS =>",

          groupBookings.map(

            (b) => ({

              id: b.id,

              payment_group:

                b.payment_group,

              status:

                b.status,

            })

          ),

        );

        // =====================================================
        // CẬP NHẬT TẤT CẢ BOOKING
        // =====================================================
        //
        // deposit:
        // → deposit_paid
        //
        // full payment:
        // → paid
        //
        // Đồng thời:
        //
        // status = booked
        //
        // hold_until = null
        //
        for (const b of groupBookings) {

          // =====================================================
          // THANH TOÁN CỌC
          // =====================================================
          //
          if (

            b.payment_method ===
              "deposit"

          ) {

            b.payment_status =

              "deposit_paid";

          }

          // =====================================================
          // THANH TOÁN TOÀN BỘ
          // =====================================================
          //
          else {

            b.payment_status =

              "paid";
          }

          // =====================================================
          // ĐẶT SÂN THÀNH CÔNG
          // =====================================================
          //
          b.status =

            "booked";

          // =====================================================
          // XÓA THỜI GIAN GIỮ CHỖ
          // =====================================================
          //
          b.hold_until =

            null;

          // =====================================================
          // LƯU DATABASE
          // =====================================================
          //
          await b.save({

            transaction,

          });
        }

        // =====================================================
        // TẠO USER VOUCHER
        // =====================================================
        //
        // Nếu booking có voucher:
        //
        // → ghi nhận người dùng đã sử dụng voucher.
        //
        const firstBooking =
  groupBookings[0];

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

  await voucherService
    .increaseVoucherUsedCount({

      voucherId:
        foundVoucher.id,

      transaction,

    });
}

  await voucherService
    .createUserVoucher({
      userId:
        firstBooking.userId,

      voucherCode:
        firstBooking.voucher_code,

      bookingId:
        firstBooking.id,

      transaction,
    });
}

        // =====================================================
        // COMMIT TRANSACTION
        // =====================================================
        //
        // Tất cả thay đổi sẽ được lưu:
        //
        // - payment_status
        // - status
        // - voucher
        //
        await transaction.commit();

        console.log(

          "✅ PAYMENT SUCCESS"

        );
                // =====================================================
        // TẠO THÔNG BÁO REALTIME
        // =====================================================
        //
        // Lấy instance Socket.IO
        // đã được lưu trong app.
        //
        const io =

          req.app.get("io");

        // =====================================================
        // GỬI THÔNG BÁO CHO TỪNG USER
        // =====================================================
        //
        // Nội dung:
        //
        // "Thanh toán thành công"
        //
        // Đồng thời lưu notification
        // vào database.
        //
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

          // =====================================================
          // GỬI REALTIME QUA SOCKET
          // =====================================================
          //
          // user_1
          // user_2
          // ...
          //
          io.to(

            `user_${b.userId}`

          ).emit(

            "new_notification",

            notification

          );
        }

        // =====================================================
        // CẬP NHẬT SLOT ĐÃ ĐƯỢC ĐẶT
        // =====================================================
        //
        // Phát sự kiện realtime
        // để frontend cập nhật giao diện.
        //
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

        // =====================================================
        // KẾT THÚC WEBHOOK THÀNH CÔNG
        // =====================================================
        //
        return res.send("OK");

      } catch (error) {

        // =====================================================
        // CÓ LỖI TRONG TRANSACTION
        // =====================================================
        //
        // Hoàn tác toàn bộ thay đổi.
        //
        await transaction.rollback();

        console.error(

          "PAYMENT TRANSACTION ERROR =>",

          error

        );

        return res.send("OK");
      }

    } catch (err) {

      // =====================================================
      // LỖI WEBHOOK
      // =====================================================
      //
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
//
// Chức năng:
//
// Hủy thanh toán và giải phóng slot.
//
// Frontend gọi API này khi:
//
// - Người dùng bấm hủy.
// - Thanh toán thất bại.
//
const cancelPayment = async (

  req,

  res

) => {

  try {

    // =====================================================
    // NHẬN bookingIds TỪ FRONTEND
    // =====================================================
    //
    const {

      bookingIds,

    } = req.body;

    // =====================================================
    // KIỂM TRA bookingIds
    // =====================================================
    //
    if (

      !bookingIds ||

      !Array.isArray(
        bookingIds
      )

    ) {

      return res.status(400).json({

        success: false,

        message:

          "bookingIds required",

      });
    }

    // =====================================================
    // TÌM CÁC BOOKING CẦN HỦY
    // =====================================================
    //
    const bookings =

      await Booking.findAll({

        where: {

          id: {

            [Op.in]:

              bookingIds,

          },

        },

      });

    // =====================================================
    // CẬP NHẬT BOOKING
    // =====================================================
    //
    // status:
    // cancelled
    //
    // payment_status:
    // cancelled
    //
    // hold_until:
    // null
    //
    for (const b of bookings) {

      b.status =

        "cancelled";

      b.payment_status =

        "cancelled";

      b.hold_until =

        null;

      await b.save();

      // =====================================================
      // GIẢI PHÓNG SLOT REALTIME
      // =====================================================
      //
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

    // =====================================================
    // TRẢ KẾT QUẢ THÀNH CÔNG
    // =====================================================
    //
    return res.json({

      success: true,

    });

  } catch (e) {

    // =====================================================
    // LỖI HỦY THANH TOÁN
    // =====================================================
    //
    console.error(

      "CANCEL PAYMENT ERROR =>",

      e,

    );

    return res.status(500).json({

      success: false,

    });
  }
};


// =====================================================
// EXPORT CONTROLLER
// =====================================================
//
// createPayment:
// tạo link thanh toán.
//
// paymentWebhook:
// PayOS gọi về sau thanh toán.
//
// cancelPayment:
// hủy thanh toán.
//
module.exports = {

  createPayment,

  paymentWebhook,

  cancelPayment,

};