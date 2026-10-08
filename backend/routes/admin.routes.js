const router = require("express").Router();
const ctrl = require("../controllers/admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("admin"));

router.get("/stats", ctrl.stats);
router.get("/events", ctrl.listEvents);
router.patch("/events/:id/status", ctrl.setEventStatus);
router.get("/users", ctrl.listUsers);
router.patch("/users/:id/suspend", ctrl.suspendUser);
router.get("/transactions", ctrl.transactions);

module.exports = router;
