const Review = require("../models/review");
const User = require("../models/user");
const Field = require("../models/field");


// =====================================================
// CREATE REVIEW
// =====================================================
//
// Chức năng:
//
// Người dùng đánh giá sân.
//
// Frontend gửi:
//
// fieldId
// userId
// rating
// comment
//
// Backend sẽ lưu review.
//
exports.createReview = async (

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

      userId,

      rating,

      comment,

    } = req.body;


    // =====================================================
    // TẠO REVIEW
    // =====================================================
    //
    // fieldId:
    // sân được đánh giá.
    //
    // userId:
    // người đánh giá.
    //
    // rating:
    // số sao.
    //
    // comment:
    // nội dung đánh giá.
    //
    const review =

      await Review.create({

        fieldId,

        userId,

        rating,

        comment,

      });


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json({

      success: true,

      review,

    });

  } catch (e) {

    // =====================================================
    // XỬ LÝ LỖI
    // =====================================================
    //
    console.log(

      e

    );

    res.status(500).json({

      message:

        "Lỗi tạo review",

    });
  }
};


// =====================================================
// GET REVIEW BY FIELD
// =====================================================
//
// Chức năng:
//
// Lấy tất cả review của một sân.
//
// Frontend gửi:
//
// fieldId
//
// Backend sẽ trả:
//
// review +
// thông tin user.
//
exports.getReviews = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY REVIEW THEO SÂN
    // =====================================================
    //
    const reviews =

      await Review.findAll({

        where: {

          fieldId:

            req.params.fieldId,

        },

        order: [

          [

            "createdAt",

            "DESC",

          ],

        ],

      });


    // =====================================================
    // GHÉP THÔNG TIN USER
    // =====================================================
    //
    // Promise.all:
    // chạy song song nhiều query.
    //
    const data =

      await Promise.all(

        reviews.map(

          async (item) => {

            const user =

              await User.findByPk(

                item.userId

              );


            return {

              ...item.toJSON(),

              user: {

                name:

                  user?.name ??

                  "User",

                avatar:

                  user?.avatar ??

                  "",

              },

            };
          }

        )

      );


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json(

      data

    );

  } catch (e) {

    console.log(

      e

    );

    res.status(500).json({

      message:

        "Lỗi lấy review",

    });
  }
};


// =====================================================
// GET ALL REVIEWS
// =====================================================
//
// Chức năng:
//
// Admin lấy toàn bộ review.
//
// Đồng thời lấy:
//
// User
// Field
//
exports.getAllReviews = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY TOÀN BỘ REVIEW
    // =====================================================
    //
    const reviews =

      await Review.findAll({

        order: [

          [

            "createdAt",

            "DESC",

          ],

        ],

      });


    // =====================================================
    // GHÉP USER + FIELD
    // =====================================================
    //
    const data =

      await Promise.all(

        reviews.map(

          async (item) => {

            const user =

              await User.findByPk(

                item.userId

              );


            const field =

              await Field.findByPk(

                item.fieldId

              );


            return {

              ...item.toJSON(),

              user: {

                id:

                  user?.id,

                name:

                  user?.name ??

                  "User",

                avatar:

                  user?.avatar ??

                  "",

              },

              field: {

                id:

                  field?.id,

                name:

                  field?.name ??

                  "Sân bóng",

                address:

                  field?.address ??

                  "",

                image:

                  field?.image ??

                  "",

              },

            };
          }

        )

      );


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json(

      data

    );

  } catch (e) {

    console.log(

      e

    );

    res.status(500).json({

      message:

        "Lỗi lấy tất cả review",

    });
  }
};


// =====================================================
// UPDATE REVIEW
// =====================================================
//
// Chức năng:
//
// Cập nhật review.
//
exports.updateReview = async (

  req,

  res

) => {

  try {

    const {

      id,

    } = req.params;


    const {

      rating,

      comment,

    } = req.body;


    // =====================================================
    // TÌM REVIEW
    // =====================================================
    //
    const review =

      await Review.findByPk(

        id

      );


    // =====================================================
    // REVIEW KHÔNG TỒN TẠI
    // =====================================================
    //
    if (

      !review

    ) {

      return res.status(404)

        .json({

          message:

            "Review không tồn tại",

        });
    }


    // =====================================================
    // CẬP NHẬT REVIEW
    // =====================================================
    //
    review.rating =

      rating;

    review.comment =

      comment;


    await review.save();


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json({

      success: true,

      message:

        "Sửa review thành công",

      review,

    });

  } catch (e) {

    console.log(

      e

    );

    res.status(500).json({

      message:

        "Lỗi sửa review",

    });
  }
};


// =====================================================
// DELETE REVIEW
// =====================================================
//
// Chức năng:
//
// Xóa review.
//
exports.deleteReview = async (

  req,

  res

) => {

  try {

    const {

      id,

    } = req.params;


    // =====================================================
    // TÌM REVIEW
    // =====================================================
    //
    const review =

      await Review.findByPk(

        id

      );


    // =====================================================
    // REVIEW KHÔNG TỒN TẠI
    // =====================================================
    //
    if (

      !review

    ) {

      return res.status(404)

        .json({

          message:

            "Review không tồn tại",

        });
    }


    // =====================================================
    // XÓA REVIEW
    // =====================================================
    //
    await review.destroy();


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    res.json({

      success: true,

      message:

        "Xóa review thành công",

    });

  } catch (e) {

    console.log(

      e

    );

    res.status(500).json({

      message:

        "Lỗi xóa review",

    });
  }
};