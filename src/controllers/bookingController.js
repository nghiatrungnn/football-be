  const {
    booking: Booking,
    field: Field,
    user: User,
    sequelize,
    FieldPricing,
  } = require("../models");

  const voucherService = require("../services/voucherService");
// Các toán tử Sequelize
  const { Op } = require("sequelize");

  const axios = require("axios");

  // ================= GET IO =================
  const getIO = (req) => req.app.get("io");

  // ================= FORMAT TIME VN =================
  const formatVNTime = (time) => {

    if (!time) return null;

    return time
      .toString()
      .slice(0, 5);
  };

  // ================= FORMAT DATE =================
  const formatDateOnly = (date) => {
    return new Date(date)
      .toISOString()
      .split("T")[0];
  };

  // ================= FORMAT BOOKING RESPONSE =================
  const formatBookingResponse = (
    booking
  ) => {

    // ================= OCCUPIED SLOTS =================
  // Danh sách slot bị chiếm
    const occupied_slots = [];

  const [sh, sm] =
    booking.start_time
      .split(":")
      .map(Number);

  const [eh, em] =
    booking.end_time
      .split(":")
      .map(Number);

  let current =
    sh * 60 + sm;

  const end =
    eh * 60 + em;

  while (current < end) {

    const h =
      Math.floor(current / 60);

    const m =
      current % 60;

    occupied_slots.push(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    );

    current += 30;
  }


    return {
      ...booking.toJSON(),

      refund_amount:
  booking.refund_amount || 0,

refund_reason:
  booking.refund_reason,

refund_requested_at:
  booking.refund_requested_at,

refunded_at:
  booking.refunded_at,

      booking_date:
          formatDateOnly(
              booking.booking_date
          ),

      start_time:
          formatVNTime(
              booking.start_time
          ),

      end_time:
          formatVNTime(
              booking.end_time
          ),

      occupied_slots,
    };

  };

  // ================= EMIT REALTIME =================
  // Hàm gửi realtime cập nhật trạng thái slot
  const emitSlotUpdate = ({
    io,
    fieldId,
    bookingDate,
    startTime,
    status,
    userId = null,
    holdUntil = null,
  }) => {
      // Gửi sự kiện slot_update tới room của sân
    io.to(`field-${fieldId}`).emit(
      "slot_update",
      {
        field_id: fieldId,
        booking_date: bookingDate,
        time: startTime,
        status,
        userId,
        hold_until: holdUntil,
      }
    );

    console.log(
      `📡 SLOT UPDATE => ${status} | field-${fieldId}`
    );
  };

  // ================= CLEAN EXPIRED HOLDS =================
  // Hàm hủy các slot giữ sân đã hết hạn
  const cleanExpiredHold = async (
    io = null
  ) => {
    try {
    // Tìm tất cả booking đang giữ sân nhưng đã hết hạn
      const expired =
          await Booking.findAll({
        where: {

          status: "holding",
  // Thời gian giữ nhỏ hơn hiện tại
          hold_until: {
            [Op.lt]:
            new Date(),
          },
        },
      });
    // Duyệt từng booking hết hạn
      for (const b of expired) {
 // Nếu có Socket.IO
        if (io) {
 // Gửi realtime mở lại slot
          emitSlotUpdate({
            io,

            fieldId:
            b.fieldId,

            bookingDate:
            b.booking_date,

            startTime:
            b.start_time,

            status:
            "cancelled",
          });
        }
     // Đổi trạng thái booking thành đã hủy
        b.status = "cancelled";
 // Đổi trạng thái thanh toán thành hết hạn
b.payment_status =
  "expired";
// Xóa thời gian giữ sân
b.hold_until = null;
 // Lưu xuống database
await b.save();
      }
 // Nếu có booking bị hủy
      if (
      expired.length > 0
      ) {

        console.log(
            `⏰ Cleaned ${expired.length} expired holds`
        );
      }

    } catch (err) {

      console.error(
          "❌ cleanExpiredHold error:",
          err
      );
    }
  };

  // ================= HOLD SLOT =================
  // Hàm giữ sân
  const holdSlot = async (
    req,
    res
  ) => {
    const transaction =
      await sequelize.transaction();

    try {
        // Lấy Socket.IO
      const io = getIO(req);
 // Xóa các slot giữ sân đã hết hạn
      await cleanExpiredHold(io);
 // Lấy dữ liệu từ frontend
      const {
        field_id,
        booking_date,
        start_time,
      } = req.body;
 // Kiểm tra dữ liệu bắt buộc
      if (
        !field_id ||
        !booking_date ||
        !start_time
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Missing fields",
        });
      }
   // Nếu giờ có dạng HH:mm
      const fixedTime =
    start_time.toString().length === 5
      ? `${start_time}:00`
      : start_time.toString();
    // Giờ bắt đầu
      const startDateTime = fixedTime;
 // Thời lượng thuê sân
      const duration =
    Number(
      req.body.duration || 60
    );
   // Tách giờ phút giây
  const [h, m, s] =
    fixedTime.split(":").map(Number);
   // Tính giờ kết thúc
  const end = new Date(
    2025,
    1,
    1,
    h,
    m + duration,
    s || 0
  );
  // Chuyển giờ kết thúc thành HH:mm:ss
  const endDateTime =
    `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}:00`;

      // ================= CHECK CONFLICT =================
       // Kiểm tra trùng lịch
      const conflict =
  await Booking.findOne({

    where: {
// Cùng sân
      fieldId: field_id,
 // Cùng ngày
      booking_date,
 // Trạng thái đang giữ hoặc đã đặt
      status: {
        [Op.in]: [
          "holding",
          "booked",
        ],
      },
// Kiểm tra khoảng thời gian có bị trùng với booking khác không
      [Op.and]: [

        sequelize.where(
          sequelize.col("start_time"),
          "<",
          endDateTime
        ),
// end_time của booking khác > start_time của slot mới
        sequelize.where(
          sequelize.col("end_time"),
          ">",
          startDateTime
        ),
      ],
    },
// Sử dụng transaction
    transaction,
  });
// Nếu bị trùng
      if (conflict) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Slot already taken",
        });
      }

      // ================= HOLD 5 MIN =================
        // Tạo thời gian giữ sân 5 phút
      const holdUntil =
        new Date(
          Date.now() +
            2 * 60 * 1000
        );

      // ================= CREATE HOLD =================
      // Tạo booking giữ sân
      const booking =
        await Booking.create(
          {
            userId: req.user.id,

            fieldId: field_id,

            booking_date,

            start_time:
              startDateTime,

            end_time:
              endDateTime,

            status: "holding",

            hold_until:
              holdUntil,

            total_price: 0,

            payment_method:
            "deposit",

            payment_status:
              "pending",
          },

          {
            transaction,
          }
              // Lưu booking giữ sân xuống database
        );
  // Commit transaction
      await transaction.commit();
// Khởi tạo thời gian bắt đầu của booking
      let emitTime = new Date(
    booking.start_time
  );
// Lặp qua từng khoảng thời gian của booking
  while (
    emitTime < booking.end_time
  ) {
// Gửi realtime cập nhật slot sang frontend
    emitSlotUpdate({

  io,

  fieldId: field_id,

  bookingDate:
    booking_date,
 // Khung giờ hiện tại cần cập nhật
  startTime:
    emitTime,

  status: "holding",
 // Người đang giữ sân
  userId:
    req.user.id,
// Thời gian hết hạn giữ sân
  holdUntil,
});
// Chuyển sang slot tiếp theo (mỗi 30 phút)
    emitTime = new Date(
      emitTime.getTime() +
        30 * 60 * 1000
    );
  }

      return res.json({
        // Đánh dấu thành công
        success: true,
  // Thông tin booking giữ sân
        booking:
          formatBookingResponse(
            booking
          ),

        hold_until: holdUntil,
      });
    } catch (err) {
      try {
         // Rollback transaction nếu có lỗi
        await transaction.rollback();
      } catch (_) {}
   // In lỗi ra console
      console.error(
        "❌ holdSlot error:",
        err
      );
// Trả lỗi về frontend
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ================= CANCEL HOLD =================
  // Hủy giữ sân
  const cancelHold = async (
    req,
    res
  ) => {
    try {
       // Lấy Socket.IO
      const io = getIO(req);
// Lấy dữ liệu frontend gửi lên
      const {
        field_id,
        booking_date,
        start_time,
      } = req.body;
 // Nếu giờ có dạng HH:mm
      const fixedTime =
      start_time.toString().length === 5
       // Thêm giây vào cuối
          ? `${start_time}:00`
          // Giữ nguyên nếu đã có HH:mm:ss
          : start_time.toString();
  // Gán giờ bắt đầu chuẩn hóa
      const startDateTime = fixedTime;

  console.log(
    "START =>",
    startDateTime
  );
// Tìm booking đang giữ sân
      const booking =
  await Booking.findOne({

    where: {
 // Đúng người dùng hiện tại
      userId: req.user.id,
 // Đúng sân
      fieldId: field_id,
// Đúng ngày đặt
      booking_date,
// Chỉ tìm booking đang giữ sân
      status: "holding",
// Chỉ tìm booking chưa hết hạn giữ
      hold_until: {
        [Op.gt]: new Date(),
      },
      // Kiểm tra thời điểm cần hủy có nằm trong booking hay không
// Điều kiện:
// start_time <= thời điểm cần hủy < end_time
 // Kiểm tra slot nằm trong khoảng booking
      [Op.and]: [
// start_time <= giờ cần hủy
        sequelize.where(
          sequelize.col("start_time"),
          "<=",
          startDateTime
        ),
 // end_time > giờ cần hủy
        sequelize.where(
          sequelize.col("end_time"),
          ">",
          startDateTime
        ),
      ],
    },
  });
 // Nếu không tìm thấy booking
      if (!booking) {
         // Trả lỗi cho frontend
        return res.status(404).json({
          success: false,
          message:
            "Holding slot not found",
        });
      }
 // Xóa booking giữ sân khỏi database
      await booking.destroy();

// FORCE DB UPDATE
   // Làm sạch các booking hết hạn
await cleanExpiredHold(io);
  // Gửi realtime cập nhật slot
      emitSlotUpdate({
        io,
        fieldId: field_id,
        bookingDate:
          booking_date,
        startTime:
          startDateTime,
        status: "cancelled",
         // Người dùng hủy giữ sân
        userId: req.user.id,
      });

      return res.json({
        success: true,
        message:
          "Hold cancelled successfully",
      });
    } catch (err) {
      console.error(
        "❌ cancelHold error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ================= CREATE BOOKING =================
  // Hàm tạo booking chính thức
  const createBooking = async (
    req,
    res
  ) => {
  // Tạo transaction để đảm bảo toàn vẹn dữ liệu
    const transaction =
        await sequelize.transaction();

    try {
// Lấy đối tượng Socket.IO
      const io = getIO(req);
 // Lấy dữ liệu frontend gửi lên
      const {
  field_id,
  // Danh sách slot cần đặt
  bookings,
 // Thời lượng thuê sân
  duration,

  voucher_code,
// Thông tin khách hàng
  name,
  phone,
  email,

  payment_method,
   // Mã giao dịch
  transaction_code,
    // Ghi chú thanh toán
  payment_note,
  // Nhóm thanh toán
  payment_group,

  field_type,
  field_name,
} = req.body;
// In dữ liệu gửi lên để debug
console.log(req.body);
// Kiểm tra dữ liệu bắt buộc
      if (
  !field_id ||
  !bookings ||
  !Array.isArray(bookings) ||
  bookings.length === 0
) {
 // Hủy transaction
        await transaction.rollback();
// Trả lỗi
        return res.status(400).json({
          success: false,
          message: "Missing fields",
        });
      }

      // ================= FIELD =================
 // Tìm sân theo ID
const field =
  await Field.findByPk(field_id);
// Nếu không tìm thấy sân
if (!field) {
 // Hủy transaction
  await transaction.rollback();
// Trả lỗi
  return res.status(404).json({
    success: false,
    message: "Field not found",
  });
}

// ================= CALCULATE PRICE =================
 // Tổng tiền ban đầu
let total_price = 0;
 // Duyệt từng slot
for (const item of bookings) {
// Giờ của slot
  const slotTime = item.slot;
// Tìm bảng giá phù hợp
  const pricing =
    await FieldPricing.findOne({

      where: {
        fieldId: field_id,
 // Slot nằm trong khoảng giá
        start_time: {
          [Op.lte]: slotTime,
        },

        end_time: {
          [Op.gt]: slotTime,
        },
      },
    });
  // Giá áp dụng
  const pricePerHour =
    pricing
      ? pricing.price_per_hour
      : field.price_per_hour;
 // Cộng dồn tổng tiền
  total_price +=
    pricePerHour *
    (duration / 60);
}

// ================= APPLY VOUCHER =================
let discountAmount = 0;

let finalAmount =
  total_price;

// Nếu khách chọn thanh toán đặt cọc nhưng lại gửi mã voucher
if (
  payment_method === "deposit" &&
  voucher_code?.trim()
) {

  await transaction.rollback();

  return res.status(400).json({
    success: false,
    message:
      "Thanh toán đặt cọc không được sử dụng voucher",
  });
}

// Chỉ cho dùng voucher khi thanh toán toàn bộ
if (
  voucher_code?.trim() &&
  payment_method === "full"
){
// Gọi service kiểm tra voucher có hợp lệ không
  const voucherResult =
  await voucherService.validateVoucher({
    code: voucher_code,

    amount: total_price,

    userId: req.user.id,

    transaction,
  });

  if (!voucherResult.valid) {

    await transaction.rollback();

    return res.status(400).json({
      success: false,
      message:
        voucherResult.message,
    });
  }

  discountAmount =
    voucherResult.discount;

  finalAmount =
    voucherResult.finalAmount;
}
   // Danh sách booking đã tạo
const createdBookings = [];
 // Tổng voucher đã phân bổ
let allocatedDiscount = 0;
// Tạo mã nhóm thanh toán
const paymentGroup =
payment_group ||
`GROUP_${Date.now()}_${req.user.id}`;
// Duyệt từng slot mà người dùng muốn đặt
      for (const item of bookings) {
  // Lấy ngày đặt sân
  const bookingDate =
    item.date;
  // Lấy giờ bắt đầu
  const slot =
    item.slot;
  // Nếu giờ có dạng HH:mm
  const fixedTime =
    slot.toString().length === 5
      // Thêm giây vào cuối
      ? `${slot}:00`
      // Giữ nguyên nếu đã có HH:mm:ss
      : slot.toString();
  // Giờ bắt đầu chuẩn hóa
  const startDateTime =
    fixedTime;
 // Tách giờ phút giây
        const [h, m, s] =
    fixedTime.split(":").map(Number);
 // Tính giờ kết thúc
  const end = new Date(
    2025,
    1,
    1,
    h,
    m + duration,
    s || 0
  );
  // Chuyển giờ kết thúc thành HH:mm:ss
  const endDateTime =
    `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}:00`;

        // ================= FIND HOLD =================
 // Tìm booking giữ sân trước đó
        const booking =
 await Booking.findOne({

   where: {
  // Đúng người dùng hiện tại
     userId:
       req.user.id,

     fieldId:
       field_id,
  // Đúng ngày đặt
     booking_date:
       bookingDate,
  // Đúng giờ bắt đầu
     start_time:
       startDateTime,
// Phải đang ở trạng thái giữ sân
     status:
       "holding",
  // Booking giữ sân chưa hết hạn
     hold_until: {
       [Op.gt]:
         new Date(),
     },
   },
// Sử dụng transaction
   transaction,
 });
// Nếu không tìm thấy booking giữ sân
        if (!booking) {

          await transaction.rollback();
  // Trả lỗi về frontend
          return res.status(404).json({
            success: false,
            message:
 `Slot ${slot} ngày ${bookingDate} chưa được giữ`,
          });
        }

  // =====================================================
  // DEPOSIT
  // =====================================================
// Giữ nguyên trạng thái holding
booking.status =
  "holding";
 // Chưa thanh toán
booking.payment_status =
  "pending";
 // Gia hạn thời gian giữ sân thêm 10 phút
booking.hold_until =
  new Date(
    Date.now() +
    10 * 60 * 1000
  );
        // =====================================================
        // INFO
        // =====================================================
 // Lưu họ tên khách hàng
booking.name = name;
 // Lưu số điện thoại
booking.phone = phone;
  // Lưu email
booking.email = email;
// Lưu phương thức thanh toán
booking.payment_method =
  payment_method;
// Lưu mã giao dịch
booking.transaction_code =
  transaction_code || null;
  // Lưu ghi chú thanh toán
booking.payment_note =
  payment_note || null;
 // Lưu loại sân
booking.field_type =
  field_type || field.type;
  // Lưu tên sân
booking.field_name =
  field_name || field.name;

// =====================================================
// PAYMENT GROUP
// =====================================================
  // Gán mã nhóm thanh toán
booking.payment_group =
  paymentGroup;

// =====================================================
// PRICE
// =====================================================
 // Tìm bảng giá của slot hiện tại
const pricing =
  await FieldPricing.findOne({
    where: {
      fieldId: field_id,
 // Slot nằm trong khoảng giá
      start_time: {
        [Op.lte]: slot,
      },

      end_time: {
        [Op.gt]: slot,
      },
    },
  });
 // Giá của slot
const slotPrice =
  pricing
   // Lấy giá trong bảng giá
    ? pricing.price_per_hour
     // Nếu không có thì lấy giá mặc định của sân
    : field.price_per_hour;
 // Giá booking theo thời lượng
const bookingPrice =
 // Giá theo giờ
  slotPrice *
   // Quy đổi theo thời lượng thuê
  (duration / 60);

// =====================================================
// VOUCHER
// =====================================================

 // Tỷ lệ giá của slot này trên toàn bộ đơn hàng
const discountRatio =
  bookingPrice / total_price;

// Biến lưu voucher của slot hiện tại
let bookingDiscount;
 // Kiểm tra có phải slot cuối cùng không
const isLastBooking =
  createdBookings.length ===
  bookings.length - 1;
 // Nếu là booking cuối cùng
if (isLastBooking) {
 // Nhận toàn bộ phần voucher còn lại
  bookingDiscount =
    discountAmount -
    allocatedDiscount;

} else {
 // Chia voucher theo tỷ lệ giá của slot
  bookingDiscount =
    Math.round(
        // Tổng tiền giảm của voucher
      discountAmount *
           // Tỷ lệ của slot hiện tại
      discountRatio
    );
 // Cộng dồn voucher đã chia
  allocatedDiscount +=
    bookingDiscount;
}

// =====================================================
// FINAL PRICE
// =====================================================

 // Giá cuối cùng của slot
const bookingFinal =
  bookingPrice -
  bookingDiscount;
// Giá gốc của booking này
  booking.total_price =
  bookingPrice;
// Số tiền được giảm bởi voucher
booking.discount_amount =
  bookingDiscount;
// Giá cuối cùng sau khi giảm
booking.final_amount =
  bookingFinal;

// =====================================================
// DEPOSIT
// =====================================================

// Nếu khách chọn thanh toán cọc
  if (
  payment_method === "deposit"
) {

  booking.deposit_percent =
    30;
  // Tiền cọc phải thanh toán
  booking.deposit_amount =
    Math.round(
      bookingFinal * 0.3
    );
  // Số tiền còn lại thanh toán tại sân
  booking.remaining_amount =
    bookingFinal -
    booking.deposit_amount;

} else {
  // Thanh toán toàn bộ
  booking.deposit_percent =
    100;
 // Tiền đã thanh toán
  booking.deposit_amount =
    bookingFinal;
  // Không còn tiền cần thanh toán
  booking.remaining_amount =
    0;
}
// Lưu thời lượng thuê sân
  booking.duration =
  duration;
// Lưu mã voucher đã sử dụng
booking.voucher_code =
  payment_method === "full"
    ? voucher_code?.trim() || null
    : null;

// =====================================================
// SAVE
// =====================================================
// Lưu tất cả thay đổi của booking xuống database
await booking.save({
  transaction,
});

// Thêm booking vừa xử lý vào mảng booking đã tạo
createdBookings.push(booking);

// =====================================================
// REALTIME SLOT UPDATE
// =====================================================

// Khởi tạo thời gian bắt đầu của booking
        let emitTime = new Date(
    booking.start_time
  );
  
// Lặp qua toàn bộ khoảng thời gian của booking
  while (
    emitTime < booking.end_time
  ) {
 // Gửi realtime cập nhật trạng thái slot
    emitSlotUpdate({
  io,

  fieldId: field_id,

  bookingDate:
    bookingDate,

  startTime:
    emitTime,

  status: booking.status,

  userId:
    req.user.id,

  holdUntil:
    booking.hold_until,
});
  // Chuyển sang slot tiếp theo sau 30 phút
    emitTime = new Date(
      emitTime.getTime() +
        30 * 60 * 1000
    );
  }
      }
// Lưu toàn bộ thay đổi xuống database
      await transaction.commit();

// =====================================================
// DEPOSIT NOTIFICATION
// =====================================================
// Nếu khách chọn hình thức đặt cọc
if (
  payment_method === "deposit"
) {
 // Import service xử lý thông báo
  const notificationService =
    require(
      "../services/notificationService"
    );
  // Duyệt tất cả booking vừa tạo
  for (const booking of createdBookings) {
    // Tạo thông báo cho người dùng
 const notification =
  await notificationService
    .createNotification({
  // Người nhận thông báo
      userId:
        booking.userId,

      title:
        "Đặt sân thành công",

      message:
        `Bạn đã đặt sân ${booking.field_name} lúc ${booking.start_time}`,

      type:
        "booking",

      icon:
        "sports_soccer",

      route:
        "/booking-info",

      referenceId:
        booking.id,
    });
    // Gửi realtime thông báo tới người dùng
io.to(
  `user_${booking.userId}`
).emit(
  "new_notification",
  notification
);

  // ================= ADMIN NOTIFICATION =================
  // Tìm tài khoản admin
const admin =
  await User.findOne({
    where: {
      email: "admin@gmail.com",
    },
  });

if (!admin) continue;
  // Tạo thông báo cho admin
  const adminNotification =
  await notificationService
    .createNotification({
  // Người nhận là admin
      userId: admin.id,

      title:
        "Có đơn đặt sân mới",

      message:
        `${booking.name} vừa đặt sân`,

      type:
  "admin",
  
      icon:
        "admin_panel_settings",

      route:
        "/admin/bookings",

      referenceId:
        booking.id,
    });
  // Gửi realtime thông báo cho admin
io.to(`user_${admin.id}`).emit(
  "new_notification",
  adminNotification
);


}
}
// Trả kết quả thành công về frontend
return res.json({

        success: true,

        message:
        "Booking created successfully",
// Booking đầu tiên
        booking: formatBookingResponse(
  createdBookings[0]
),
 // Danh sách tất cả booking đã tạo
        bookings:
        createdBookings.map((b) =>
            formatBookingResponse(
                b
            )
        ),
      });

    } catch (err) {

      try {
        await transaction.rollback();
      } catch (_) {}

      console.error(
          "❌ createBooking error:",
          err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ================= UPDATE BOOKING =================
  const updateBooking = async (
  req,
  res
) => {

  const transaction =
      await sequelize.transaction();

  try {

    const io = getIO(req);
// Tìm booking theo ID
    const booking =
        await Booking.findByPk(
      req.params.id
    );
  // Nếu không tìm thấy booking
    if (!booking) {

      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // ================= DATA =================
 // Lấy dữ liệu frontend gửi lên
    const {
  name,
  phone,
  email,
  status,
  payment_status,
  payment_method,
  total_price,
  slots,
  fieldId,
} = req.body;

    // ================= UPDATE INFO =================
   // Cập nhật tên
    booking.name =
        name ?? booking.name;
//  Cập nhật số điện thoại
    booking.phone =
        phone ?? booking.phone;
// Cập nhật email
    booking.email =
    email ?? booking.email;
// Cập nhật trạng thái booking
booking.status =
    status ?? booking.status;
// Cập nhật trạng thái thanh toán
    booking.payment_status =
    payment_status ??
    booking.payment_status;
// Cập nhật phương thức thanh toán
    booking.payment_method =
        payment_method ??
        booking.payment_method;
//  Cập nhật tổng tiền
    booking.total_price =
        total_price ??
        booking.total_price;
// Cập nhật sân (nếu có)
    booking.fieldId =
        fieldId ??
        booking.fieldId;
// Nếu có thay đổi trạng thái thanh toán
    if (payment_status) {
// Cập nhật toàn bộ booking cùng payment_group
  await Booking.update(
    {
      payment_status,
    },
    {
      where: {
        payment_group:
          booking.payment_group,
      },
      transaction,
    }
  );

}

    // =====================================================
    // UPDATE SLOT
    // =====================================================

    if (
        slots &&
        Array.isArray(slots) &&
        slots.length > 0
    ) {
// Lấy slot đầu tiên (giả sử chỉ cho phép cập nhật 1 slot)
      const slot =
          slots[0];
// Chuẩn hóa giờ bắt đầu và kết thúc
      const start =
      // Nếu giờ có dạng HH:mm thì thêm :00 vào cuối để thành HH:mm:ss
          slot.start.length === 5
              ? `${slot.start}:00`
              : slot.start;

      const end =
          slot.end.length === 5
              ? `${slot.end}:00`
              : slot.end;

      // ================= CHECK CONFLICT =================
// Kiểm tra trùng lịch với các booking khác (ngoại trừ chính booking đang cập nhật)
      const conflict =
          await Booking.findOne({

        where: {
            // Không kiểm tra chính booking hiện tại
          id: {
            [Op.ne]:
            booking.id,
          },
 // Sân cần cập nhật
          fieldId:
fieldId ??
booking.fieldId,

          booking_date:
          slot.date,
  // Chỉ kiểm tra booking đang hoạt động
          status: {
            [Op.in]: [
              "holding",
              "booked",
            ],
          },
// Kiểm tra khoảng thời gian có bị trùng với booking khác không
          [Op.and]: [
// start_time của booking khác < end_time của slot mới
            sequelize.where(
              sequelize.col(
                  "start_time"
              ),
              "<",
              end
            ),
// end_time của booking khác > start_time của slot mới
            sequelize.where(
              sequelize.col(
                  "end_time"
              ),
              ">",
              start
            ),
          ],
        },

        transaction,
      });
// Nếu có trùng lịch
      if (conflict) {

        await transaction.rollback();
// Trả lỗi về frontend
        return res.status(400).json({
          success: false,
          message:
          "Khung giờ bị trùng",
        });
      }

      // ================= EMIT OLD SLOT =================
      // Gửi realtime mở slot cũ
      emitSlotUpdate({

        io,

        fieldId:
        booking.fieldId,

        bookingDate:
        booking.booking_date,

        startTime:
        booking.start_time,

        status:
        "cancelled",
      });

      // ================= UPDATE SLOT =================
//  Cập nhật sân (nếu có)
      booking.fieldId =
    fieldId ??
    booking.fieldId;

booking.booking_date =
    slot.date;

booking.start_time =
    start;

booking.end_time =
    end;
// Lưu thay đổi xuống database
      await booking.save({
        transaction,
      });

      // ================= EMIT NEW SLOT =================
// Gửi realtime cập nhật slot mới
      emitSlotUpdate({

        io,

        fieldId:
        booking.fieldId,

        bookingDate:
        booking.booking_date,

        startTime:
        booking.start_time,

        status:
        booking.status,
      });
    }

    await transaction.commit();

    return res.json({

      success: true,

      message:
      "Booking updated successfully",

      booking:
      formatBookingResponse(
          booking
      ),
    });

  } catch (err) {

    try {
      await transaction.rollback();
    } catch (_) {}

    console.error(
        "❌ updateBooking error:",
        err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
  // ================= DELETE BOOKING =================
  // Hàm xóa booking
  const deleteBooking = async (
    req,
    res
  ) => {
    try {
// Tìm booking theo ID
      const booking =
        await Booking.findByPk(
          req.params.id
        );
// Nếu không tìm thấy booking
      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found",
        });
      }

      // ================= DELETE REAL =================
// Gửi realtime mở lại slot cho booking bị xóa
      await booking.destroy();
// Lấy Socket.IO
      const io = getIO(req);
      return res.json({
        success: true,
        message:
          "Booking deleted successfully",
      });

    } catch (err) {

      console.error(
        "❌ deleteBooking error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ================= GET BOOKINGS BY DATE =================
  // Hàm lấy booking theo ngày và sân
  const getByDate = async (
    req,
    res
  ) => {
    try {
// Lấy Socket.IO
      const io = getIO(req);
  // Dọn các booking giữ sân đã hết hạn
      await cleanExpiredHold(io);
// Lấy tham số query từ frontend
      const {
        field_id,
        booking_date,
      } = req.query;
// Xây dựng điều kiện truy vấn
      const whereClause = {

  // ================= BỎ BOOKING ĐÃ HỦY =================
  // Chỉ lấy những booking có trạng thái không phải là "cancelled"
  status: {
    [Op.notIn]: [
      "cancelled",
    ],
  },
};
// Nếu có truyền field_id thì thêm điều kiện lọc theo sân
if (field_id) {
// Thêm điều kiện fieldId vào whereClause
  whereClause.fieldId =
      field_id;
}
// Nếu có truyền booking_date thì thêm điều kiện lọc theo ngày đặt
if (booking_date) {
// Thêm điều kiện booking_date vào whereClause
  whereClause.booking_date =
      booking_date;
}
// Truy vấn database để lấy danh sách booking thỏa mãn điều kiện
      const bookings =
        await Booking.findAll({
          where: whereClause,
// Bao gồm thông tin người dùng và sân
          include: [
            {
              model: User,
              attributes: [
                "id",
                "name",
              ],
            },
            {
              model: Field,
            },
          ],
//
          order: [
            [
              "start_time",
              "ASC",
            ],
          ],
        });

        return res.json({
  success: true,
// Trả về danh sách booking đã được format lại để frontend dễ sử dụng
  bookings:
    bookings.map((b) =>
      formatBookingResponse(b)
    ),
});
    } catch (err) {
      console.error(
        "❌ getByDate error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ================= GET MY BOOKINGS =================
  // Hàm lấy booking của người dùng hiện tại
  const getMyBookings =
    async (req, res) => {
      try {
        const bookings =
          await Booking.findAll({
            where: {
              userId:
                req.user.id,
            },
// Bao gồm thông tin sân
            include: [
              {
                model: Field,
              },
            ],
// Sắp xếp theo ngày tạo mới nhất
            order: [
              [
                "createdAt",
                "DESC",
              ],
            ],
          });

        return res.json({
          success: true,

          bookings:
            bookings.map((b) =>
              formatBookingResponse(b)
            ),
        });
      } catch (err) {
        console.error(
          "❌ getMyBookings error:",
          err
        );

        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }
    };

  // ================= GET ALL BOOKINGS =================
  // Hàm lấy tất cả booking (dành cho admin)
  const getAllBookings =
    async (req, res) => {
      try {
        // Lấy tất cả booking, bao gồm thông tin sân và người dùng
        const bookings =
          await Booking.findAll({
            include: [
              {
                model: Field,
              },
              {
                model: User,
                attributes: [
                  "id",
                  "name",
                  "email",
                ],
              },
            ],
// Sắp xếp theo ngày tạo mới nhất
            order: [
              [
                "createdAt",
                "DESC",
              ],
            ],
          });
const grouped = {};
// Duyệt qua từng booking để nhóm theo payment_group hoặc id
bookings.forEach((b) => {
// Format lại dữ liệu booking để dễ sử dụng
  const booking =
    formatBookingResponse(b);

console.log(
  "ADMIN DATA =>",
  booking.id,
  booking.refund_bank_name,
  booking.refund_bank_number,
  booking.payment_status
);
// Sử dụng payment_group làm key để nhóm, nếu không có thì dùng id của booking
  const key =
    booking.payment_group ||
    booking.id;

    console.log(
  "RAW BOOKING =>",
  {
    id: booking.id,
    payment_status:
      booking.payment_status,
    status:
      booking.status,
    payment_method:
      booking.payment_method,
  }
);

console.log(
  "BOOKING REFUND =>",
  booking.id,
  booking.refund_bank_number
);
// Nếu nhóm chưa tồn tại thì khởi tạo
  if (!grouped[key]) {
// Khởi tạo nhóm với thông tin chung của booking
    grouped[key] = {
  ...booking,

  payment_status:
    booking.payment_status,
//  Thông tin hoàn tiền (nếu có)
  refund_amount: 0,
//  Danh sách slot của nhóm booking
  slots: [],
};
  }
// Thêm slot của booking vào nhóm
  grouped[key].slots.push({
  id: booking.id,
//  Thông tin slot
  date: booking.booking_date,
  start: booking.start_time,
  end: booking.end_time,

  status: booking.status,

  payment_status:
    booking.payment_status,
//  Thông tin hoàn tiền (nếu có)
    refund_amount:
  booking.refund_amount || 0,

  price:
    booking.final_amount ||
    booking.total_price ||
    0,
});
// Cập nhật trạng thái thanh toán của nhóm booking dựa trên trạng thái của các slot con
const statuses =
  grouped[key].slots.map(
    (s) => s.payment_status
  );
// Nếu có bất kỳ slot nào đang chờ hoàn tiền
if (
  statuses.includes(
    "refund_pending"
  )
) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "refund_pending"
  grouped[key].payment_status =
    "refund_pending";

}

// TẤT CẢ ĐÃ HOÀN
else if (
  statuses.every(
    (s) => s === "refunded"
  )
) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "refunded"
  grouped[key].payment_status =
    "refunded";

}

// CÒN SLOT ĐÃ CỌC
else if (
  statuses.includes(
    "deposit_paid"
  )
) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "deposit_paid"
  grouped[key].payment_status =
    "deposit_paid";

}

// CÒN SLOT ĐÃ THANH TOÁN ĐỦ
else if (
  statuses.includes(
    "paid"
  )
) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "paid"
  grouped[key].payment_status =
    "paid";

}
// CÒN SLOT BỊ TỪ CHỐI HOÀN TIỀN
else if (
  statuses.includes(
    "refund_rejected"
  )
) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "refund_rejected"
  grouped[key].payment_status =
    "refund_rejected";

}
// CÒN SLOT ĐANG CHỜ THANH TOÁN
else if (
  statuses.every(
    (s) => s === "pending"
  )
) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "pending"
  grouped[key].payment_status =
    "pending";

}

else {
// Nếu không có điều kiện nào khớp, mặc định trạng thái thanh toán của nhóm booking là "pending"
  grouped[key].payment_status =
    "pending";

}

// Ưu tiên lấy booking có thông tin hoàn tiền
// Nếu có slot nào đang chờ hoàn tiền thì lấy thông tin hoàn tiền từ slot đó
if (
  booking.payment_status ===
  "refund_pending"
) {

  grouped[key].refund_bank_name =
    booking.refund_bank_name;

  grouped[key].refund_bank_number =
    booking.refund_bank_number;

  grouped[key].refund_bank_owner =
    booking.refund_bank_owner;

  grouped[key].refund_reason =
    booking.refund_reason;
// Lấy thời điểm yêu cầu hoàn tiền gần nhất
  grouped[key].refund_requested_at =
    booking.refund_requested_at;
// Cộng dồn số tiền hoàn lại của các slot trong nhóm booking
  grouped[key].refund_amount =
    (grouped[key].refund_amount || 0) +
    Number(
      booking.refund_amount || 0
    );
}
// Nếu không có slot nào đang chờ hoàn tiền nhưng có slot nào đã được hoàn tiền thì lấy thông tin hoàn tiền từ slot đã được hoàn tiền đó
const allPending =
  grouped[key].slots.every(
    (s) =>
      s.payment_status ===
      "pending"
  );

if (allPending) {
// Cập nhật trạng thái thanh toán của nhóm booking thành "pending"
  grouped[key].payment_status =
    "pending";
}

});

console.log(
  JSON.stringify(
    Object.values(grouped),
    null,
    2
  )
);

return res.json({
  success: true,
  bookings:
    Object.values(grouped),
});

return res.json({
  success: true,
  bookings:
    Object.values(grouped),
});
      } catch (err) {
        console.error(
          "❌ getAllBookings error:",
          err
        );

        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }
    };

  // ================= CANCEL =================
// Hàm hủy booking và gửi yêu cầu hoàn tiền
const cancel = async (
  req,
  res
) => {

  try {

    const io = getIO(req);
// Tìm booking theo ID, bao gồm thông tin sân
    const booking =
await Booking.findByPk(
  req.params.id,
  {
    include: [Field]
  }
);

      console.log(
  "CANCEL BOOKING ID =>",
  req.params.id
);

console.log(
  "CANCEL BODY =>",
  req.body
);

console.log(
  "BANK NAME =>",
  req.body.bank_name
);

console.log(
  "BANK NUMBER =>",
  req.body.bank_number
);

console.log(
  "BANK OWNER =>",
  req.body.bank_owner
);

console.log(
  "REASON =>",
  req.body.reason
);

    if (!booking) {

      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    // ================= CHECK USER =================

    if (
      booking.userId !== req.user.id
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Không có quyền",
      });
    }

    // ================= ĐÃ HỦY =================

    if (
      booking.status ===
      "cancelled"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Đơn đã hủy",
      });
    }

    // ================= TIME CHECK =================

    const bookingDateTime =
      new Date(
        `${booking.booking_date}T${booking.start_time}`
      );

    const now = new Date();

    const diffHours =
      (bookingDateTime - now) /
      (1000 * 60 * 60);

    if (diffHours < 2) {

      return res.status(400).json({
        success: false,
        message:
          "Chỉ được hủy trước 2 tiếng",
      });
    }

    // =====================================================
    // PAYOS
    // =====================================================

if (
  !req.body.bank_name ||
  !req.body.bank_number ||
  !req.body.bank_owner
) {

  return res.status(400).json({
    success: false,
    message:
      "Vui lòng nhập đầy đủ thông tin ngân hàng",
  });
}

let refundAmount = 0;

if (booking.payment_method === "deposit") {
  refundAmount = booking.deposit_amount || 0;
} else {
  refundAmount =
    booking.final_amount ||
    booking.total_price ||
    0;
}

   await booking.update({
  payment_status: "refund_pending",

  refund_status: "pending",

  refund_amount: refundAmount,

  refund_bank_name: req.body.bank_name,

  refund_bank_number: req.body.bank_number,

  refund_bank_owner: req.body.bank_owner,

  refund_reason: req.body.reason || null,

  refund_requested_at: new Date(),
});

const notificationService =
  require(
    "../services/notificationService"
  );

const admin =
  await User.findOne({
    where: {
      email: "admin@gmail.com",
    },
  });

if (!admin) {
  return res.status(404).json({
    success: false,
    message: "Admin not found",
  });
}

const adminNotification =
  await notificationService
    .createNotification({

      userId: admin.id,

      title:
        "Yêu cầu hoàn tiền",

      message:
  `${booking.name} yêu cầu hoàn tiền booking #${booking.id}`,

      type:
        "refund",

      icon:
        "payments",

      route:
        "/admin/bookings",

      referenceId:
        booking.id,
    });

io.to(`user_${admin.id}`).emit(
  "new_notification",
  adminNotification
);

console.log(
  "REFUND REQUEST =>",
  {
    id: booking.id,

    refund_amount:
      booking.refund_amount,

    refund_bank_name:
      booking.refund_bank_name,
  }
);
    return res.json({
      success: true,

      message:
        "Đã gửi yêu cầu hoàn tiền",
    });

   } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= CANCEL PENDING PAYMENT =================

const cancelPendingPayment = async (
  req,
  res
) => {

  try {

    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.payment_status !==
      "pending"
    ) {

      return res.status(400).json({
        success: false,
        message: "Booking đã thanh toán",
      });
    }

    await Booking.destroy({
      where: {
        payment_group:
          booking.payment_group,
      },
    });

    return res.json({
      success: true,
      message:
        "Booking cancelled",
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ================= REFUND BOOKING =================

const refundBooking =
  async (req, res) => {

  try {

    const io = getIO(req);

    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {

      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    // =====================================================
    // ALREADY REFUNDED
    // =====================================================

if (
  booking.payment_status ===
  "refunded"
) {

  return res.status(400).json({
    success: false,
    message:
      "Đơn đã hoàn tiền",
  });
}

// =====================================================
// NOT REFUND PENDING
// =====================================================

if (
  booking.payment_status !==
  "refund_pending"
) {

  return res.status(400).json({
    success: false,
    message:
      "Đơn chưa yêu cầu hoàn tiền",
  });
}

    // =====================================================
    // PAYOS REFUND
    // =====================================================

    // =====================================================
// CHECK PAYMENT LINK
// =====================================================

if (
  booking.payment_method === "banking" &&
  booking.payment_link_id
) {

  const refundRes =
    await axios.post(
      `https://api-merchant.payos.vn/v2/payment-requests/${booking.payment_link_id}/cancel`,
      {
        cancellationReason:
          "Khach huy san"
      },
      {
        headers: {
          "x-client-id":
            process.env.PAYOS_CLIENT_ID,

          "x-api-key":
            process.env.PAYOS_API_KEY,
        },
      }
    );
}
  await booking.update({
  payment_status: "refunded",
  refund_status: "done",
  refunded_at: new Date(),
  hold_until: null,
});

const updatedBookings =
  await Booking.findAll({
    where: {
      payment_group:
        booking.payment_group,
    },
  });

const notificationService =
  require(
    "../services/notificationService"
  );

for (const b of updatedBookings) {

  const notification =
    await notificationService
      .createNotification({

        userId: b.userId,

        title:
          "Hoàn tiền thành công",

        message:
          `Bạn đã được hoàn ${b.refund_amount} VNĐ`,

        type: "refund",

        icon: "payments",

        route: "/history",

        referenceId: b.id,
      });

  io.to(
    `user_${b.userId}`
  ).emit(
    "new_notification",
    notification
  );
}

    // mở slot lại
    emitSlotUpdate({
      io,

      fieldId:
        booking.fieldId,

      bookingDate:
        booking.booking_date,

      startTime:
        booking.start_time,

      status:
        "cancelled",
    });

    return res.json({
      success: true,
      message:
        "Hoàn tiền thành công",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= REJECT REFUND =================

const rejectRefund = async (
  req,
  res
) => {

  try {

    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.payment_status !==
      "refund_pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Đơn chưa yêu cầu hoàn tiền",
      });
    }

  await booking.update({
  payment_status: "refund_rejected",
  refund_status: "rejected",
  refund_reason:
    req.body.reason ||
    "Không đủ điều kiện hoàn tiền",
});

    return res.json({
      success: true,
      message:
        "Đã từ chối hoàn tiền",
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET BOOKING BY ID =================
const getBookingById =
async (req, res) => {

  try {

    const booking =
    await Booking.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Field,
          },
          {
            model: User,
            attributes: [
              "id",
              "name",
              "email",
            ],
          },
        ],
      }
    );

    if (!booking) {

      return res.status(404).json({
        success: false,
        message:
        "Booking not found",
      });
    }

    return res.json({

      success: true,

      booking:
      formatBookingResponse(
        booking
      ),
    });

  } catch (err) {

    console.error(
      "❌ getBookingById error:",
      err
    );

    return res.status(500).json({

      success: false,

      message:
      err.message,
    });
  }
};

// ================= COMPLETE PAYMENT =================

const completePayment =
async (req, res) => {

  try {

    const booking =
      await Booking.findByPk(
        req.params.id
      );

    if (!booking) {

      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (
      booking.payment_status !==
      "deposit_paid"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Booking chưa thanh toán cọc",
      });
    }

    booking.payment_status =
      "paid";

    await booking.save();

    return res.json({
      success: true,
      message:
        "Đã thu đủ tiền",
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

  // ================= EXPORTS =================
module.exports = {
  holdSlot,
  cancelHold,
  createBooking,
  updateBooking,
  deleteBooking,
  getByDate,
  getMyBookings,
  getAllBookings,
  getBookingById,
  cancel,
  cancelPendingPayment,
  refundBooking,
  rejectRefund,
  completePayment,
};