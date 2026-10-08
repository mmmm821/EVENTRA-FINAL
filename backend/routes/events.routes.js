const router = require("express").Router();
const ctrl = require("../controllers/events.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

// Public discovery (attachFavorites reads the token if present, but never requires one)
router.get("/", ctrl.attachFavorites, ctrl.list);
router.get("/categories", ctrl.categories);
router.get("/favorites/mine", requireAuth, ctrl.myFavorites);
router.get("/:id", ctrl.attachFavorites, ctrl.getById);

// Organizer-only management
router.post("/", requireAuth, requireRole("organizer"), ctrl.create);
router.put("/:id", requireAuth, requireRole("organizer"), ctrl.update);
router.patch("/:id/cancel", requireAuth, requireRole("organizer"), ctrl.cancel);

// Attendee favorites
router.patch("/:id/favorite", requireAuth, requireRole("attendee"), ctrl.toggleFavorite);

module.exports = router;
