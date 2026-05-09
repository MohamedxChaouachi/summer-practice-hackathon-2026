const User = require("../models/User");
const Sport = require("../models/Sport");

exports.toggleAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.availability = {
      isAvailableToday: isAvailable,
      lastUpdated: new Date(),
    };

    await user.save();
    res.json({
      message: "Availability updated",
      availability: user.availability,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.addSport = async (req, res) => {
  try {
    const { name, skillLevel } = req.body;
    const user = await User.findById(req.user.id).populate("sports.sport");

    if (!user) return res.status(404).json({ message: "User not found" });

    let sportDoc = await Sport.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (!sportDoc) {
      sportDoc = new Sport({ name: name.toLowerCase() });
      await sportDoc.save();
    }

    // Check if user already has this sport
    if (
      user.sports.some(
        (s) => s.sport._id.toString() === sportDoc._id.toString(),
      )
    ) {
      return res.status(400).json({ message: "Sport already added" });
    }

    user.sports.push({ sport: sportDoc._id, skillLevel });
    await user.save();

    // Repopulate for the response
    await user.populate("sports.sport");

    res.json({ message: "Sport added", sports: user.sports });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllSports = async (req, res) => {
  try {
    let sports = await Sport.find({});
    if (sports.length === 0) {
      // Seed some default sports if DB is empty
      const defaultSports = [
        'Football', 'Tennis', 'Basketball', 'Volleyball', 'Padel', 
        'Running', 'Cycling', 'Swimming', 'Table Tennis', 'Badminton',
        'Cricket', 'Golf', 'Rugby', 'Hockey', 'Baseball'
      ];
      const docs = defaultSports.map(name => ({ name: name.toLowerCase() }));
      await Sport.insertMany(docs);
      sports = await Sport.find({});
    }
    res.json(sports);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.removeSport = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.sports = user.sports.filter(s => s.sport.toString() !== req.params.sportId);
    await user.save();
    res.json({ message: "Sport removed", sports: user.sports });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const aiService = require("../services/aiService");

exports.updateProfile = async (req, res) => {
  try {
    const { bio, name, country, city } = req.body;
    const user = await User.findById(req.user.id).populate("sports.sport");

    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (country) user.country = country;
    if (city) user.city = city;

    if (bio && bio !== user.bio) {
      user.bio = bio;

      // AI: Analyze bio for sports
      const allSports = await Sport.find({});
      const sportNames = allSports.map((s) => s.name);

      const detectedSportNames = await aiService.analyzeBio(bio, sportNames);
      console.log(detectedSportNames);

      for (const detectedName of detectedSportNames) {
        const sportDoc = allSports.find(
          (s) => s.name.toLowerCase() === detectedName.toLowerCase(),
        );
        if (sportDoc) {
          // Add if not already present
          if (
            !user.sports.some(
              (s) => s.sport._id.toString() === sportDoc._id.toString(),
            )
          ) {
            user.sports.push({ sport: sportDoc._id, skillLevel: "Beginner" }); // default to Beginner
          }
        }
      }
    }

    await user.save();
    await user.populate("sports.sport");

    const io = req.app.get("io");
    if (io) io.to(user._id.toString()).emit("userUpdated", { user });

    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.analyzeProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No photo provided" });
    }

    const user = await User.findById(req.user.id).populate("sports.sport");
    if (!user) return res.status(404).json({ message: "User not found" });

    const allSports = await Sport.find({});
    const sportNames = allSports.map((s) => s.name);

    const detectedSportNames = await aiService.analyzePhoto(
      req.file.buffer,
      req.file.mimetype,
      sportNames,
    );

    let newSportsAdded = [];
    for (const detectedName of detectedSportNames) {
      const sportDoc = allSports.find(
        (s) => s.name.toLowerCase() === detectedName.toLowerCase(),
      );
      if (sportDoc) {
        // Add if not already present
        if (
          !user.sports.some(
            (s) => s.sport._id.toString() === sportDoc._id.toString(),
          )
        ) {
          user.sports.push({ sport: sportDoc._id, skillLevel: "Beginner" });
          newSportsAdded.push(sportDoc.name);
        }
      }
    }

    await user.save();
    await user.populate("sports.sport");

    const io = req.app.get("io");
    if (io) io.to(user._id.toString()).emit("userUpdated", { user });

    res.json({
      message:
        newSportsAdded.length > 0
          ? `Detected and added sports: ${newSportsAdded.join(", ")}`
          : "No new sports detected from photo.",
      sports: user.sports,
      detected: newSportsAdded,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No avatar provided" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Store the URL to the avatar
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      message: "Avatar uploaded successfully",
      avatar: user.avatar,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
