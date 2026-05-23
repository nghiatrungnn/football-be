const {
  field,
  FieldPricing,
} = require("../models");

const generateSlots = require(
  "../utils/generateSlots"
);

// ===== CREATE =====
exports.create = async (
  req,
  res
) => {
  try {
    const {
      pricingRules,
      ...fieldData
    } = req.body;

    // ================= CREATE FIELD =================

    const newField =
      await field.create(
        fieldData
      );

    // ================= CREATE PRICING RULES =================

    if (
      pricingRules &&
      pricingRules.length > 0
    ) {
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

      console.log(pricingData);

await FieldPricing.bulkCreate(
  pricingData
);
    }

    // ================= GET FULL FIELD =================

    const fullField =
      await field.findByPk(
        newField.id,
        {
          include: [
            {
              model:
                FieldPricing,

              as: "pricingRules",
            },
          ],
        }
      );

    res.json(fullField);
  } catch (err) {
    res.status(500).json({
      message:
        err.message,
    });
  }
};

// ===== GET ALL =====
exports.getAll = async (
  req,
  res
) => {
  try {
    const fields =
      await field.findAll({
        include: [
          {
            model:
              FieldPricing,

            as: "pricingRules",
          },
        ],

        order: [
          ["createdAt", "DESC"],
        ],
      });

    res.json(fields);
  } catch (err) {
    res.status(500).json({
      message:
        err.message,
    });
  }
};

// ===== GET DETAIL =====
exports.getById = async (
  req,
  res
) => {
  try {
    const oneField =
      await field.findByPk(
        req.params.id,
        {
          include: [
            {
              model:
                FieldPricing,

              as: "pricingRules",
            },
          ],
        }
      );

    if (!oneField) {
      return res
        .status(404)
        .json({
          message:
            "Field not found",
        });
    }

    res.json(oneField);
  } catch (err) {
    res.status(500).json({
      message:
        err.message,
    });
  }
};

// ===== UPDATE =====
exports.update = async (
  req,
  res
) => {
  try {
    const oneField =
      await field.findByPk(
        req.params.id
      );

    if (!oneField) {
      return res
        .status(404)
        .json({
          message:
            "Field not found",
        });
    }

    const {
      pricingRules,
      ...fieldData
    } = req.body;

    // ================= UPDATE FIELD =================

    await oneField.update(
      fieldData
    );

    // ================= UPDATE PRICING =================

    if (pricingRules) {
      // xóa cũ
      await FieldPricing.destroy({
        where: {
          fieldId:
            oneField.id,
        },
      });

      // thêm mới
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

      console.log(pricingData);

await FieldPricing.bulkCreate(
  pricingData
);
    }

    // ================= GET UPDATED =================

    const updatedField =
      await field.findByPk(
        oneField.id,
        {
          include: [
            {
              model:
                FieldPricing,

              as: "pricingRules",
            },
          ],
        }
      );

    res.json(updatedField);
  } catch (err) {
    res.status(500).json({
      message:
        err.message,
    });
  }
};

// ===== DELETE =====
exports.delete = async (
  req,
  res
) => {
  try {
    const oneField =
      await field.findByPk(
        req.params.id
      );

    if (!oneField) {
      return res
        .status(404)
        .json({
          message:
            "Field not found",
        });
    }

    await oneField.destroy();

    res.json({
      message:
        "Deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message:
        err.message,
    });
  }
};

// ===== GET FIELD SLOTS =====
exports.getFieldSlots =
  async (req, res) => {
    try {
      const oneField =
        await field.findByPk(
          req.params.id,
          {
            include: [
              {
                model:
                  FieldPricing,

                as: "pricingRules",
              },
            ],
          }
        );

      if (!oneField) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Field not found",
          });
      }

      const slots =
        generateSlots(
          oneField
        );

      res.json({
        success: true,
        slots,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  };