const router = require("express").Router();
const ctrl = require("../controllers/tickets.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/mine", requireAuth, ctrl.mine);
router.get("/:id", requireAuth, ctrl.getById);
router.post("/verify", requireAuth, requireRole("organizer", "admin"), ctrl.verify);

module.exports = router;
