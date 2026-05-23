const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/isAdmin");

const ctrl = require("../controllers/fieldController");

// ================= CREATE =================
router.post("/", auth, isAdmin, ctrl.create);

// ================= GET ALL =================
router.get("/", ctrl.getAll);

// ================= GET DETAIL =================
router.get("/:id", ctrl.getById);

// ================= GET SLOTS =================
router.get("/:id/slots", ctrl.getFieldSlots);

// ================= UPDATE =================
router.put("/:id", auth, isAdmin, ctrl.update);

// ================= DELETE =================
router.delete("/:id", auth, isAdmin, ctrl.delete);

module.exports = router;