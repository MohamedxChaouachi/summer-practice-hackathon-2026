const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");
const auth = require("../middlewares/auth");

router.post("/trigger", matchController.triggerMatchmaking); // Could be admin only, but public for hackathon demo
router.get("/my-events", auth, matchController.getMyEvents);
router.get("/all-events", auth, matchController.getAllEvents);
router.post("/create-event", auth, matchController.createEvent);
router.post("/:id/apply", auth, matchController.applyToEvent);
router.post("/:id/accept", auth, matchController.acceptApplicant);
router.post("/:id/reject", auth, matchController.rejectApplicant);
router.post("/:id/plan", auth, matchController.markEventPlanned);
router.get("/notifications", auth, matchController.getNotifications);
router.put(
  "/notifications/:id/read",
  auth,
  matchController.markNotificationRead,
);
router.post("/:id/kick", auth, matchController.kickUser);
router.post("/:id/leave", auth, matchController.leaveEvent);
router.post("/join-by-code", auth, matchController.joinByCode);

module.exports = router;
