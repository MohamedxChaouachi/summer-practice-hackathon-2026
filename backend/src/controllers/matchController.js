const matchingService = require("../services/matchingService");
const Event = require("../models/Event");
const Sport = require("../models/Sport");
const Location = require("../models/Location");
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.triggerMatchmaking = async (req, res) => {
  try {
    const result = await matchingService.runMatchmaking();

    // In a real app, we would emit socket events here to notify users they've been matched
    // io.emit('matchCreated', result.events); // Need access to io instance

    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error running matchmaking", error: err.message });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ members: req.user.id })
      .populate("captain", "name avatar")
      .populate("members", "name avatar")
      .populate("pendingMembers", "name avatar")
      .populate("sport")
      .populate("location");
    res.json(events);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching events", error: err.message });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    // Cleanup sweep for invalid or stale events
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const allEvents = await Event.find({});
    
    for (const ev of allEvents) {
      // Delete if 0 members AND older than 5 minutes (gives AI events a chance to be joined)
      // OR delete if 1 member and no captain (broken state)
      if ((ev.members.length === 0 && ev.createdAt < fiveMinsAgo) || 
          (ev.members.length === 1 && !ev.captain)) {
        await Event.findByIdAndDelete(ev._id);
        const io = req.app.get("io");
        if (io) io.emit("eventDeleted", { eventId: ev._id });
      }
    }

    const events = await Event.find({})
      .populate("captain", "name avatar")
      .populate("members", "name avatar")
      .populate("pendingMembers", "name avatar")
      .populate("sport")
      .populate("location");
    res.json(events);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching all events", error: err.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      sport: sportName,
      location: locationName,
      time,
      maxPlayers,
      description,
    } = req.body;

    if (!sportName || !locationName || !time) {
      return res
        .status(400)
        .json({ message: "sport, location and time are required" });
    }

    let sport = await Sport.findOne({
      name: { $regex: new RegExp(`^${sportName}$`, "i") },
    });
    if (!sport) {
      sport = await Sport.create({
        name: sportName,
        groupSizeMin: 2,
        groupSizeMax: maxPlayers || 14,
      });
    }

    let location = await Location.findOne({
      name: { $regex: new RegExp(`^${locationName}$`, "i") },
    });
    if (!location) {
      location = await Location.create({ name: locationName, lat: 0, lng: 0 });
    }

    // Generate a random 6-character alphanumeric code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const event = await Event.create({
      sport: sport._id,
      location: location._id,
      time: new Date(time),
      captain: req.user.id,
      members: [req.user.id],
      status: "Pending",
      joinCode: joinCode,
    });

    const populated = await Event.findById(event._id)
      .populate("captain", "name avatar")
      .populate("members", "name avatar")
      .populate("sport")
      .populate("location");

    res.status(201).json(populated);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating event", error: err.message });
  }
};

exports.applyToEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.status === "Planned") {
      return res
        .status(400)
        .json({ message: "Event is already planned and closed" });
    }

    if (
      event.members.includes(req.user.id) ||
      event.pendingMembers.includes(req.user.id)
    ) {
      return res.status(400).json({ message: "Already applied or joined" });
    }

    event.pendingMembers.push(req.user.id);
    await event.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("eventUpdated", { eventId: event._id, action: "apply" });

      if (event.captain) {
        const applicant = await User.findById(req.user.id);
        const eventWithSport = await Event.findById(event._id).populate('sport');
        const sportName = eventWithSport.sport ? eventWithSport.sport.name : 'sport';
        
        await Notification.create({
          user: event.captain,
          message: `${applicant.name} has applied to join your ${sportName} event!`,
          link: `/dashboard`
        });

        io.to(event.captain.toString()).emit("newNotification", {
          message: `${applicant.name} has applied to join your ${sportName} event!`
        });
      }
    }

    res.json({ message: "Applied successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error applying to event", error: err.message });
  }
};

exports.acceptApplicant = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("sport");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.captain.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only captain can accept applicants" });
    }

    const { userId } = req.body;
    if (!event.pendingMembers.some(id => id.toString() === userId)) {
      return res.status(400).json({ message: "User is not a pending member" });
    }

    event.pendingMembers = event.pendingMembers.filter(
      (id) => id.toString() !== userId,
    );
    event.members.push(userId);
    await event.save();

    // Create notification
    await Notification.create({
      user: userId,
      message: `You have been accepted to the event: ${event.sport?.name || "Sport Event"}`,
      link: `/dashboard`,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("eventUpdated", { eventId: event._id, action: "accept" });
      io.to(userId.toString()).emit("newNotification", {
        message: `You have been accepted to the event: ${event.sport?.name || "Sport Event"}`,
      });
    }

    res.json({ message: "Applicant accepted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error accepting applicant", error: err.message });
  }
};

exports.rejectApplicant = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.captain.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only captain can reject applicants" });
    }

    const { userId } = req.body;
    event.pendingMembers = event.pendingMembers.filter(
      (id) => id.toString() !== userId,
    );
    await event.save();

    const io = req.app.get("io");
    if (io) io.emit("eventUpdated", { eventId: event._id, action: "reject" });

    res.json({ message: "Applicant rejected" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error rejecting applicant", error: err.message });
  }
};

exports.markEventPlanned = async (req, res) => {
  console.log("markEventPlanned called for event:", req.params.id);
  console.log("User ID from token:", req.user.id);
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      console.log("Event not found");
      return res.status(404).json({ message: "Event not found" });
    }

    console.log("Event captain from DB:", event.captain);
    if (!event.captain || event.captain.toString() !== req.user.id) {
      console.log(
        "User is not captain. Captain is:",
        event.captain ? event.captain.toString() : "undefined",
      );
      return res
        .status(403)
        .json({ message: "Only captain can mark event as planned" });
    }

    event.status = "Planned";
    await event.save();
    console.log("Event marked as planned successfully");

    const io = req.app.get("io");
    if (io) io.emit("eventUpdated", { eventId: event._id, action: "plan" });

    res.json({ message: "Event marked as planned" });
  } catch (err) {
    console.error("Error marking event as planned:", err);
    res
      .status(500)
      .json({ message: "Error marking event as planned", error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching notifications", error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    notification.read = true;
    await notification.save();
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating notification", error: err.message });
  }
};

exports.kickUser = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.captain.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only captain can kick users" });
    }

    const { userId } = req.body;
    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ message: "Captain cannot kick themselves" });
    }

    event.members = event.members.filter((id) => id.toString() !== userId);
    await event.save();

    const io = req.app.get("io");
    if (io)
      io.emit("eventUpdated", {
        eventId: event._id,
        action: "kick",
        kickedUserId: userId,
      });

    res.json({ message: "User kicked from event" });
  } catch (err) {
    res.status(500).json({ message: "Error kicking user", error: err.message });
  }
};

exports.joinByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });

    const event = await Event.findOne({ joinCode: code.toUpperCase() });
    if (!event)
      return res
        .status(404)
        .json({ message: "Invalid code or event not found" });

    if (event.members.includes(req.user.id)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this event" });
    }

    event.members.push(req.user.id);
    if (!event.captain) {
        event.captain = req.user.id;
    }
    if (event.pendingMembers) {
        event.pendingMembers = event.pendingMembers.filter(
            (id) => id.toString() !== req.user.id,
        );
    }
    await event.save();

    const io = req.app.get("io");
    if (io)
      io.emit("eventUpdated", { eventId: event._id, action: "join_by_code" });

    res.json({
      message: "Joined event successfully by code",
      eventId: event._id,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error joining by code", error: err.message });
  }
};

exports.leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.members = event.members.filter((id) => id.toString() !== req.user.id);

    if (event.members.length === 0) {
      await Event.findByIdAndDelete(req.params.id);
      const io = req.app.get("io");
      if (io) io.emit("eventDeleted", { eventId: req.params.id });
      return res.json({ message: "Left and event deleted (no members left)" });
    }

    if ((event.captain && event.captain.toString() === req.user.id) || !event.captain) {
      if (event.members.length > 0) {
        event.captain = event.members[0];
      } else {
        event.captain = undefined;
      }
    }

    await event.save();

    const io = req.app.get("io");
    if (io)
      io.emit("eventUpdated", { eventId: event._id, action: "leave", userId: req.user.id });

    res.json({ message: "Left event successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error leaving event", error: err.message });
  }
};
