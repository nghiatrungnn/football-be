const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/isAdmin");

const ctrl = require("../controllers/fieldController");
const upload = require("../middlewares/upload");

// ================= CREATE =================
router.post(
  "/",
  auth,
  isAdmin,
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "images",
      maxCount: 20,
    },
  ]),
  ctrl.create
);

// ================= GET ALL =================
router.get("/", ctrl.getAll);

// ================= GET DETAIL =================
router.get("/:id", ctrl.getById);

// ================= GET SLOTS =================
router.get("/:id/slots", ctrl.getFieldSlots);

// ================= UPDATE =================
router.put(
  "/:id",
  auth,
  isAdmin,
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "images",
      maxCount: 20,
    },
  ]),
  ctrl.update
);

// ================= DELETE =================
router.delete("/:id", auth, isAdmin, ctrl.delete);

module.exports = router;