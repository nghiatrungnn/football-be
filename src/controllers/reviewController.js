const Review = require("../models/review");
const User = require("../models/user");

// ================= CREATE REVIEW =================
exports.createReview = async (req, res) => {
  try {
    const {
      fieldId,
      userId,
      rating,
      comment,
    } = req.body;

    const review = await Review.create({
      fieldId,
      userId,
      rating,
      comment,
    });

    res.json({
      success: true,
      review,
    });
  } catch (e) {
    console.log(e);

    res.status(500).json({
      message: "Lỗi tạo review",
    });
  }
};

// ================= GET REVIEW BY FIELD =================
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: {
        fieldId: req.params.fieldId,
      },

      order: [["createdAt", "DESC"]],
    });

    const data = await Promise.all(
      reviews.map(async (item) => {
        const user = await User.findByPk(
          item.userId
        );

        return {
          ...item.toJSON(),

          user: {
            name:
              user?.name ?? "User",

            avatar:
              user?.avatar ?? "",
          },
        };
      })
    );

    res.json(data);
  } catch (e) {
    console.log(e);

    res.status(500).json({
      message: "Lỗi lấy review",
    });
  }
};

// ================= GET ALL REVIEW =================
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      order: [["createdAt", "DESC"]],
    });

    const data = await Promise.all(
      reviews.map(async (item) => {
        const user = await User.findByPk(
          item.userId
        );

        return {
          ...item.toJSON(),

          user: {
            name:
              user?.name ?? "User",

            avatar:
              user?.avatar ?? "",
          },
        };
      })
    );

    res.json(data);
  } catch (e) {
    console.log(e);

    res.status(500).json({
      message: "Lỗi lấy tất cả review",
    });
  }
};

// ================= UPDATE REVIEW =================
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      rating,
      comment,
    } = req.body;

    const review =
      await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        message: "Review không tồn tại",
      });
    }

    review.rating = rating;
    review.comment = comment;

    await review.save();

    res.json({
      success: true,
      message: "Sửa review thành công",
      review,
    });
  } catch (e) {
    console.log(e);

    res.status(500).json({
      message: "Lỗi sửa review",
    });
  }
};

// ================= DELETE REVIEW =================
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review =
      await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        message: "Review không tồn tại",
      });
    }

    await review.destroy();

    res.json({
      success: true,
      message: "Xóa review thành công",
    });
  } catch (e) {
    console.log(e);

    res.status(500).json({
      message: "Lỗi xóa review",
    });
  }
};