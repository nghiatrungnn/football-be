const { FieldPricing } = require("../models");

// ===============================
// CREATE PRICING
// ===============================

const createPricing = async (req, res) => {
  try {
    const {
      fieldId,
      start_time,
      end_time,
      price_per_hour,
      label,
    } = req.body;

    const pricing = await FieldPricing.create({
      fieldId,
      start_time,
      end_time,
      price_per_hour,
      label,
    });

    res.status(201).json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET PRICING BY FIELD
// ===============================

const getPricingByField = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const pricing = await FieldPricing.findAll({
      where: {
        fieldId,
      },
      order: [["start_time", "ASC"]],
    });

    res.json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPricing,
  getPricingByField,
};