const router = require("express").Router();

const auth = require("../middlewares/authMiddleware"); // FIX: thống nhất 1 file
const isAdmin = require("../middlewares/isAdmin");
const ctrl = require("../controllers/fieldController");

// ================= DEBUG (QUAN TRỌNG) =================
console.log("auth:", typeof auth);
console.log("isAdmin:", typeof isAdmin);
console.log("create:", typeof ctrl?.create);

// ================= CREATE =================
router.post("/", auth, isAdmin, ctrl.create);

// ================= GET ALL =================
router.get("/", ctrl.getAll);

// ================= GET DETAIL =================
router.get("/:id", ctrl.getById);

// ================= UPDATE =================
router.put("/:id", ctrl.update);

// ================= DELETE =================
router.delete("/:id", ctrl.delete);

module.exports = router;