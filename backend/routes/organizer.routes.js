const router = require("express").Router();
const ctrl = require("../controllers/organizer.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("organizer"));

router.get("/dashboard", ctrl.dashboard);
router.get("/events", ctrl.myEvents);

module.exports = router;
