const router = require("express").Router();
const ctrl = require("../controllers/bookings.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

router.post("/", ctrl.create);
router.get("/mine", ctrl.mine);
router.get("/:id", ctrl.getById);
router.post("/:id/pay", ctrl.pay);
router.patch("/:id/cancel", ctrl.cancel);

module.exports = router;
