// =====================================================
// IMPORT MODELS
// =====================================================
//
// field:
// model bảng sân bóng.
//
// FieldPricing:
// model bảng giá theo khung giờ.
//
const {
  field,
  FieldPricing,
} = require("../models");


// =====================================================
// IMPORT UTILS
// =====================================================
//
// generateSlots:
//
// Hàm sinh danh sách slot giờ
// dựa trên thời gian mở cửa,
// đóng cửa và thời lượng mỗi slot.
//
const generateSlots = require(
  "../utils/generateSlots"
);


// =====================================================
// CREATE FIELD
// =====================================================
//
// Chức năng:
//
// 1. Nhận dữ liệu sân từ frontend.
// 2. Upload ảnh đại diện.
// 3. Upload nhiều ảnh chi tiết.
// 4. Tạo sân mới.
// 5. Tạo pricing rules.
// 6. Trả về đầy đủ thông tin sân.
//
exports.create = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY DỮ LIỆU TỪ REQUEST
    // =====================================================
    //
    // pricingRules:
    // danh sách bảng giá.
    //
    // fieldData:
    // toàn bộ thông tin sân.
    //
    let {

      pricingRules,

      ...fieldData

    } = req.body;


    // =====================================================
    // CHUYỂN pricingRules SANG JSON
    // =====================================================
    //
    // Khi gửi multipart/form-data,
    // pricingRules thường là string.
    //
    // Ví dụ:
    //
    // "[{...},{...}]"
    //
    // cần parse thành array.
    //
    if (

      typeof pricingRules ===
        "string"

    ) {

      pricingRules =

        JSON.parse(
          pricingRules
        );
    }


    // =====================================================
    // ẢNH ĐẠI DIỆN
    // =====================================================
    //
    // req.files.image:
    // ảnh đại diện sân.
    //
    if (

      req.files?.image?.length

    ) {

      fieldData.image =

        req.files
          .image[0]
          .path;
    }


    // =====================================================
    // DANH SÁCH ẢNH
    // =====================================================
    //
    // req.files.images:
    // nhiều ảnh chi tiết.
    //
    if (

      req.files?.images?.length

    ) {

      fieldData.images =

        req.files.images.map(

          (img) =>

            img.path

        );
    }


    // =====================================================
    // TẠO SÂN MỚI
    // =====================================================
    //
    // fieldData có thể gồm:
    //
    // name
    // address
    // price_per_hour
    // open_time
    // close_time
    // ...
    //
    const newField =

      await field.create(

        fieldData

      );


    // =====================================================
    // TẠO PRICING RULES
    // =====================================================
    //
    // pricingRules:
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
    if (

      pricingRules &&

      pricingRules.length > 0

    ) {

      // =====================================================
      // CHUẨN HÓA DỮ LIỆU
      // =====================================================
      //
      // Thêm fieldId
      // cho từng pricing rule.
      //
      const pricingData =

        pricingRules.map(

          (item) => ({

            fieldId:

              newField.id,

            start_time:

              item.start_time,

            end_time:

              item.end_time,

            price_per_hour:

              item.price_per_hour,

            label:

              item.label,

          })

        );


      console.log(

        pricingData

      );


      // =====================================================
      // THÊM NHIỀU DÒNG
      // =====================================================
      //
      // bulkCreate:
      //
      // insert nhiều bản ghi
      // trong một lần.
      //
      await FieldPricing.bulkCreate(

        pricingData

      );
    }


    // =====================================================
    // LẤY THÔNG TIN ĐẦY ĐỦ
    // =====================================================
    //
    // include pricingRules
    // để frontend nhận đủ dữ liệu.
    //
    const fullField =

      await field.findByPk(

        newField.id,

        {

          include: [

            {

              model:

                FieldPricing,

              as:

                "pricingRules",

            },

          ],

        }

      );


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json(

      fullField

    );

  } catch (err) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    res.status(500).json({

      message:

        err.message,

    });
  }
};
// =====================================================
// GET ALL FIELDS
// =====================================================
//
// Chức năng:
//
// Lấy toàn bộ sân bóng trong hệ thống.
//
// Đồng thời lấy luôn:
//
// pricingRules
//
// để frontend hiển thị đầy đủ.
//
exports.getAll = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY DANH SÁCH SÂN
    // =====================================================
    //
    // include pricingRules:
    // lấy bảng giá theo khung giờ.
    //
    // order:
    // sân mới nhất sẽ lên đầu.
    //
    const fields =

      await field.findAll({

        include: [

          {

            model:

              FieldPricing,

            as:

              "pricingRules",

          },

        ],

        order: [

          [

            "createdAt",

            "DESC",

          ],

        ],

      });


    // =====================================================
    // TRẢ DỮ LIỆU
    // =====================================================
    //
    res.json(

      fields

    );

  } catch (err) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    res.status(500).json({

      message:

        err.message,

    });
  }
};



// =====================================================
// GET FIELD DETAIL
// =====================================================
//
// Chức năng:
//
// Lấy thông tin chi tiết
// của một sân.
//
// Frontend truyền:
//
// req.params.id
//
// Ví dụ:
//
// GET /fields/5
//
// sẽ lấy sân có id = 5.
//
exports.getById = async (

  req,

  res

) => {

  try {

    // =====================================================
    // TÌM SÂN THEO ID
    // =====================================================
    //
    // include pricingRules:
    // lấy luôn bảng giá.
    //
    const oneField =

      await field.findByPk(

        req.params.id,

        {

          include: [

            {

              model:

                FieldPricing,

              as:

                "pricingRules",

            },

          ],

        }

      );


    // =====================================================
    // KHÔNG TÌM THẤY SÂN
    // =====================================================
    //
    // Trả về 404.
    //
    if (

      !oneField

    ) {

      return res

        .status(404)

        .json({

          message:

            "Field not found",

        });
    }


    // =====================================================
    // TRẢ THÔNG TIN CHI TIẾT
    // =====================================================
    //
    res.json(

      oneField

    );

  } catch (err) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    res.status(500).json({

      message:

        err.message,

    });
  }
};
// =====================================================
// UPDATE FIELD
// =====================================================
//
// Chức năng:
//
// 1. Tìm sân cần cập nhật.
// 2. Kiểm tra sân có tồn tại không.
// 3. Cập nhật thông tin sân.
// 4. Xử lý ảnh đại diện.
// 5. Xử lý danh sách ảnh.
// 6. Cập nhật pricingRules.
// 7. Trả về dữ liệu mới nhất.
//
exports.update = async (

  req,

  res

) => {

  try {

    // =====================================================
    // TÌM SÂN CẦN CẬP NHẬT
    // =====================================================
    //
    // req.params.id:
    // id sân truyền từ URL.
    //
    const oneField =

      await field.findByPk(

        req.params.id

      );


    // =====================================================
    // KHÔNG TÌM THẤY SÂN
    // =====================================================
    //
    if (

      !oneField

    ) {

      return res

        .status(404)

        .json({

          message:

            "Field not found",

        });
    }


    // =====================================================
    // LẤY DỮ LIỆU TỪ REQUEST
    // =====================================================
    //
    // pricingRules:
    // bảng giá mới.
    //
    // fieldData:
    // thông tin sân.
    //
    let {

      pricingRules,

      ...fieldData

    } = req.body;


    // =====================================================
    // CHUYỂN pricingRules THÀNH JSON
    // =====================================================
    //
    // Frontend gửi multipart/form-data
    // nên pricingRules thường là string.
    //
    if (

      typeof pricingRules ===
        "string"

    ) {

      pricingRules =

        JSON.parse(

          pricingRules

        );
    }


    // =====================================================
    // DANH SÁCH ẢNH CŨ
    // =====================================================
    //
    // Frontend gửi lên để giữ lại
    // những ảnh chưa bị xóa.
    //
    let existingImages = [];


    if (

      req.body.existingImages

    ) {

      existingImages =

        JSON.parse(

          req.body.existingImages

        );
    }


    // =====================================================
    // CẬP NHẬT ẢNH ĐẠI DIỆN
    // =====================================================
    //
    // Nếu upload ảnh mới
    // thì thay thế ảnh cũ.
    //
    if (

      req.files?.image?.length

    ) {

      fieldData.image =

        req.files

          .image[0]

          .path;
    }


    // =====================================================
    // ẢNH MỚI ĐƯỢC UPLOAD
    // =====================================================
    //
    const uploadedImages =

      req.files?.images?.map(

        (img) =>

          img.path

      ) ||

      [];


    // =====================================================
    // GHÉP ẢNH CŨ + ẢNH MỚI
    // =====================================================
    //
    // existingImages:
    // ảnh được giữ lại.
    //
    // uploadedImages:
    // ảnh vừa upload.
    //
    fieldData.images = [

      ...existingImages,

      ...uploadedImages,

    ];


    // =====================================================
    // CẬP NHẬT THÔNG TIN SÂN
    // =====================================================
    //
    // update:
    // cập nhật toàn bộ fieldData.
    //
    await oneField.update(

      fieldData

    );


    // =====================================================
    // CẬP NHẬT PRICING RULES
    // =====================================================
    //
    // Nếu frontend gửi pricingRules mới.
    //
    if (

      pricingRules

    ) {

      // =====================================================
      // XÓA BẢNG GIÁ CŨ
      // =====================================================
      //
      await FieldPricing.destroy({

        where: {

          fieldId:

            oneField.id,

        },

      });


      // =====================================================
      // TẠO DỮ LIỆU MỚI
      // =====================================================
      //
      const pricingData =

        pricingRules.map(

          (item) => ({

            fieldId:

              oneField.id,

            start_time:

              item.start_time,

            end_time:

              item.end_time,

            price_per_hour:

              item.price_per_hour,

            label:

              item.label,

          })

        );


      console.log(

        pricingData

      );


      // =====================================================
      // THÊM BẢNG GIÁ MỚI
      // =====================================================
      //
      await FieldPricing.bulkCreate(

        pricingData

      );
    }


    // =====================================================
    // LẤY DỮ LIỆU MỚI NHẤT
    // =====================================================
    //
    // include pricingRules
    //
    const updatedField =

      await field.findByPk(

        oneField.id,

        {

          include: [

            {

              model:

                FieldPricing,

              as:

                "pricingRules",

            },

          ],

        }

      );


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json(

      updatedField

    );

  } catch (err) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    res.status(500).json({

      message:

        err.message,

    });
  }
};
// =====================================================
// DELETE FIELD
// =====================================================
//
// Chức năng:
//
// Xóa một sân khỏi hệ thống.
//
// Quy trình:
//
// 1. Tìm sân theo id.
// 2. Kiểm tra sân tồn tại.
// 3. Xóa sân.
// 4. Trả kết quả.
//
exports.delete = async (

  req,

  res

) => {

  try {

    // =====================================================
    // TÌM SÂN THEO ID
    // =====================================================
    //
    const oneField =

      await field.findByPk(

        req.params.id

      );


    // =====================================================
    // KHÔNG TÌM THẤY SÂN
    // =====================================================
    //
    if (

      !oneField

    ) {

      return res

        .status(404)

        .json({

          message:

            "Field not found",

        });
    }


    // =====================================================
    // XÓA SÂN
    // =====================================================
    //
    await oneField.destroy();


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json({

      message:

        "Deleted successfully",

    });

  } catch (err) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    res.status(500).json({

      message:

        err.message,

    });
  }
};


// =====================================================
// GET FIELD SLOTS
// =====================================================
//
// Chức năng:
//
// Trả về danh sách slot của sân.
//
// Đồng thời:
//
// - Kiểm tra slot đã qua chưa.
// - Tính giá theo pricingRules.
// - Gắn label cho từng slot.
//
// Frontend dùng API này
// để hiển thị lịch đặt sân.
//
exports.getFieldSlots =

  async (req, res) => {

    try {

      // =====================================================
      // LẤY THÔNG TIN SÂN
      // =====================================================
      //
      // include pricingRules
      //
      const oneField =

        await field.findByPk(

          req.params.id,

          {

            include: [

              {

                model:

                  FieldPricing,

                as:

                  "pricingRules",

              },

            ],

          }

        );


      // =====================================================
      // KHÔNG TÌM THẤY SÂN
      // =====================================================
      //
      if (

        !oneField

      ) {

        return res

          .status(404)

          .json({

            success:

              false,

            message:

              "Field not found",

          });
      }


      // =====================================================
      // SINH DANH SÁCH SLOT
      // =====================================================
      //
      // generateSlots:
      //
      // Ví dụ:
      //
      // 06:00
      // 07:00
      // 08:00
      // ...
      //
      const slots =

        generateSlots(

          oneField

        );


      // =====================================================
      // LẤY GIỜ VIỆT NAM
      // =====================================================
      //
      // Asia/Ho_Chi_Minh
      //
      const now =

        new Date(

          new Date()

            .toLocaleString(

              "en-US",

              {

                timeZone:

                  "Asia/Ho_Chi_Minh",

              }

            )

        );


      // =====================================================
      // NGÀY HIỆN TẠI
      // =====================================================
      //
      // YYYY-MM-DD
      //
      const today =

        `${now.getFullYear()}-${
          String(
            now.getMonth() + 1
          ).padStart(2, "0")
        }-${
          String(
            now.getDate()
          ).padStart(2, "0")
        }`;


      // =====================================================
      // NGÀY ĐƯỢC CHỌN
      // =====================================================
      //
      // Nếu frontend truyền:
      //
      // ?date=2026-06-15
      //
      // thì dùng ngày đó.
      //
      // Nếu không:
      //
      // dùng ngày hiện tại.
      //
      const selectedDate =

        req.query.date ||

        today;


      console.log(

        "NOW =",

        now

      );

      console.log(

        "TODAY =",

        today

      );

      console.log(

        "SELECTED DATE =",

        selectedDate

      );


      // =====================================================
      // CẬP NHẬT SLOT
      // =====================================================
      //
      const updatedSlots =

        slots.map(

          (slot) => {

            // =====================================================
            // TÁCH NGÀY
            // =====================================================
            //
            const [

              year,

              month,

              day,

            ] =

              selectedDate

                .split("-")

                .map(Number);


            // =====================================================
            // TÁCH GIỜ SLOT
            // =====================================================
            //
            const [

              hour,

              minute,

            ] =

              slot.start

                .split(":")

                .map(Number);


            // =====================================================
            // GHÉP THÀNH DATETIME
            // =====================================================
            //
            const slotDateTime =

              new Date(

                year,

                month - 1,

                day,

                hour,

                minute,

                0

              );


            // =====================================================
            // SLOT ĐÃ QUA
            // =====================================================
            //
            // Chỉ kiểm tra
            // nếu selectedDate = hôm nay.
            //
            const isPast =

              selectedDate ===

                today &&

              slotDateTime

                .getTime() <

              now.getTime();


            // =====================================================
            // TÌM BẢNG GIÁ
            // =====================================================
            //
            const pricing =

              oneField.pricingRules?.find(

                (p) => {

                  // =====================================================
                  // KHUNG GIỜ BÌNH THƯỜNG
                  // =====================================================
                  //
                  // Ví dụ:
                  //
                  // 08:00 → 17:00
                  //
                  if (

                    p.start_time <

                    p.end_time

                  ) {

                    return (

                      slot.start >=

                        p.start_time &&

                      slot.start <

                        p.end_time

                    );
                  }


                  // =====================================================
                  // KHUNG GIỜ QUA NGÀY
                  // =====================================================
                  //
                  // Ví dụ:
                  //
                  // 22:00 → 02:00
                  //
                  return (

                    slot.start >=

                      p.start_time ||

                    slot.start <

                      p.end_time

                  );
                }

              );


            // =====================================================
            // TRẢ SLOT MỚI
            // =====================================================
            //
            return {

              ...slot,

              // slot đã qua
              isPast,

              // giá theo pricing
              price:

                pricing?.price_per_hour ||

                oneField.price_per_hour,

              // nhãn giá
              label:

                pricing?.label ||

                "normal",

            };
          }

        );


      // =====================================================
      // TRẢ KẾT QUẢ
      // =====================================================
      //
      res.json({

        success:

          true,

        slots:

          updatedSlots,

      });

    } catch (err) {

      // =====================================================
      // XỬ LÝ LỖI
      // =====================================================
      //
      res.status(500).json({

        success:

          false,

        message:

          err.message,

      });
    }
  };