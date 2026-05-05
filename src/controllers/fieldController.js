const { Field } = require("../models");

// ===== CREATE =====
exports.create = async (req, res) => {
  try {
    const field = await Field.create(req.body);
    res.json(field);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== GET ALL =====
exports.getAll = async (req, res) => {
  try {
    const fields = await Field.findAll({
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
    const field = await Field.findByPk(req.params.id);

    if (!field) {
      return res.status(404).json({ message: "Field not found" });
    }

    res.json(field);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== UPDATE =====
exports.update = async (req, res) => {
  try {
    const field = await Field.findByPk(req.params.id);

    if (!field) {
      return res.status(404).json({ message: "Field not found" });
    }

    await field.update(req.body);
    res.json(field);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== DELETE =====
exports.delete = async (req, res) => {
  try {
    const field = await Field.findByPk(req.params.id);

    if (!field) {
      return res.status(404).json({ message: "Field not found" });
    }

    await field.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};