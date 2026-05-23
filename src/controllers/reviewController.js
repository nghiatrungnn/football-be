const Review =
  require("../models/review");

const User =
  require("../models/user");

exports.createReview =
  async (req, res) => {
    try {
      const {
        fieldId,
        userId,
        rating,
        comment,
      } = req.body;

      const review =
        await Review.create({
          fieldId,
          userId,
          rating,
          comment,
        });

      res.json(review);
    } catch (e) {
      console.log(e);

      res.status(500).json({
        message:
          "Lỗi tạo review",
      });
    }
  };

exports.getReviews =
  async (req, res) => {
    try {
      const reviews =
        await Review.findAll({
          where: {
            fieldId:
              req.params.fieldId,
          },

          order: [
            ["createdAt", "DESC"],
          ],
        });

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

      res.json(data);
    } catch (e) {
      console.log(e);

      res.status(500).json({
        message:
          "Lỗi lấy review",
      });
    }
  };