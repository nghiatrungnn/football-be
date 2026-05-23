const { field } = require("../models");
const generateSlots = require("../utils/generateSlots");

// ===== CREATE =====
exports.create = async (req, res) => {
  try {
    const newField = await field.create(req.body);
    res.json(newField);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== GET ALL =====
exports.getAll = async (req, res) => {
  try {
    const fields = await field.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(fields);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== GET DETAIL =====
exports.getById = async (req, res) => {
  try {
    const oneField = await field.findByPk(req.params.id);

    if (!oneField) {
      return res.status(404).json({
        message: "Field not found",
      });
    }

    res.json(oneField);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== UPDATE =====
exports.update = async (req, res) => {
  try {
    const oneField = await field.findByPk(req.params.id);

    if (!oneField) {
      return res.status(404).json({
        message: "Field not found",
      });
    }

    await oneField.update(req.body);

    res.json(oneField);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== DELETE =====
exports.delete = async (req, res) => {
  try {
    const oneField = await field.findByPk(req.params.id);

    if (!oneField) {
      return res.status(404).json({
        message: "Field not found",
      });
    }

    await oneField.destroy();

    res.json({
      message: "Deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== GET FIELD SLOTS =====
exports.getFieldSlots = async (req, res) => {
  try {
    const oneField = await field.findByPk(req.params.id);

    if (!oneField) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    const slots = generateSlots(oneField);

    res.json({
      success: true,
      slots,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};