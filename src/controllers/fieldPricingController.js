const { FieldPricing } = require("../models");


// =====================================================
// CREATE PRICING
// =====================================================
//
// Chức năng:
//
// Tạo một khung giá mới cho sân.
//
// Ví dụ:
//
// 06:00 - 17:00 → 200.000đ
// 17:00 - 22:00 → 350.000đ
//
// Frontend gửi:
//
// fieldId
// start_time
// end_time
// price_per_hour
// label
//
// Backend sẽ lưu vào bảng FieldPricing.
//
const createPricing = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY DỮ LIỆU TỪ FRONTEND
    // =====================================================
    //
    const {

      fieldId,

      start_time,

      end_time,

      price_per_hour,

      label,

    } = req.body;


    // =====================================================
    // TẠO PRICING MỚI
    // =====================================================
    //
    // fieldId:
    // id sân.
    //
    // start_time:
    // giờ bắt đầu áp dụng.
    //
    // end_time:
    // giờ kết thúc áp dụng.
    //
    // price_per_hour:
    // giá mỗi giờ.
    //
    // label:
    // tên khung giá.
    //
    const pricing =

      await FieldPricing.create({

        fieldId,

        start_time,

        end_time,

        price_per_hour,

        label,

      });


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    // status 201:
    // tạo thành công.
    //
    res.status(201).json({

      success: true,

      pricing,

    });

  } catch (error) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    console.log(

      error

    );

    res.status(500).json({

      success: false,

      message:

        error.message,

    });
  }
};


// =====================================================
// GET PRICING BY FIELD
// =====================================================
//
// Chức năng:
//
// Lấy tất cả khung giá của một sân.
//
// Frontend gửi:
//
// fieldId
//
// Backend sẽ trả:
//
// [
//   {
//     start_time,
//     end_time,
//     price_per_hour,
//     label
//   }
// ]
//
const getPricingByField = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY fieldId TỪ URL
    // =====================================================
    //
    const {

      fieldId,

    } = req.params;


    // =====================================================
    // TÌM PRICING THEO SÂN
    // =====================================================
    //
    // where:
    // lọc theo fieldId.
    //
    // order:
    // sắp xếp theo giờ tăng dần.
    //
    const pricing =

      await FieldPricing.findAll({

        where: {

          fieldId,

        },

        order: [

          [

            "start_time",

            "ASC",

          ],

        ],

      });


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json({

      success: true,

      pricing,

    });

  } catch (error) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    console.log(

      error

    );

    res.status(500).json({

      success: false,

      message:

        error.message,

    });
  }
};


// =====================================================
// EXPORT
// =====================================================
//
// createPricing:
// tạo khung giá.
//
// getPricingByField:
// lấy danh sách khung giá theo sân.
//
module.exports = {

  createPricing,

  getPricingByField,

};