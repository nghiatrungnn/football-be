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
    let {
  pricingRules,
  ...fieldData
} = req.body;

if (typeof pricingRules === "string") {
  pricingRules = JSON.parse(pricingRules);
}

    if (req.files?.image?.length) {
  fieldData.image =
    req.files.image[0].path;
}

if (req.files?.images?.length) {
  fieldData.images =
    req.files.images.map(
      (img) => img.path
    );
}

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

    let {
  pricingRules,
  ...fieldData
} = req.body;

if (typeof pricingRules === "string") {
  pricingRules = JSON.parse(pricingRules);
}

let existingImages = [];

if (req.body.existingImages) {
  existingImages = JSON.parse(
    req.body.existingImages
  );
}

if (req.files?.image?.length) {
  fieldData.image =
    req.files.image[0].path;
}

const uploadedImages =
  req.files?.images?.map(
    (img) => img.path
  ) || [];

fieldData.images = [
  ...existingImages,
  ...uploadedImages,
];

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

      const now = new Date(
  new Date().toLocaleString(
    "en-US",
    {
      timeZone: "Asia/Ho_Chi_Minh",
    }
  )
);

const now = new Date(
  new Date().toLocaleString(
    "en-US",
    {
      timeZone: "Asia/Ho_Chi_Minh",
    }
  )
);

const now = new Date(
  new Date().toLocaleString(
    "en-US",
    {
      timeZone: "Asia/Ho_Chi_Minh",
    }
  )
);

const today =
  `${now.getFullYear()}-${
    String(now.getMonth() + 1)
      .padStart(2, "0")
  }-${
    String(now.getDate())
      .padStart(2, "0")
  }`;

const selectedDate =
  req.query.date || today;

  console.log("NOW =", now);
console.log("TODAY =", today);
console.log(
  "SELECTED DATE =",
  selectedDate
);

const updatedSlots =
  slots.map((slot) => {

    const [year, month, day] =
  selectedDate.split("-").map(Number);

const [hour, minute] =
  slot.start.split(":").map(Number);

const slotDateTime =
  new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0
  );

    const isPast =
      selectedDate === today &&
      slotDateTime.getTime() <
      now.getTime();

    const pricing =
  oneField.pricingRules?.find((p) => {

    if (
      p.start_time < p.end_time
    ) {
      return (
        slot.start >= p.start_time &&
        slot.start < p.end_time
      );
    }

    return (
      slot.start >= p.start_time ||
      slot.start < p.end_time
    );
  });

    return {
      ...slot,

      isPast,

      price:
        pricing?.price_per_hour ||
        oneField.price_per_hour,

      label:
        pricing?.label ||
        "normal",
    };
  });

      res.json({
        success: true,
        slots: updatedSlots,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  };