const User = require("../models/User");
const Sport = require("../models/Sport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const aiService = require("../services/aiService");

exports.register = async (req, res) => {
  try {
    const { name, email, password, bio, sports } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const processedSports = [];
    if (sports && sports.length > 0) {
      for (let s of sports) {
        let sportDoc = await Sport.findOne({
          name: { $regex: new RegExp(`^${s.name}$`, "i") },
        });
        if (!sportDoc) {
          sportDoc = new Sport({ name: s.name.toLowerCase() });
          await sportDoc.save();
        }
        processedSports.push({ sport: sportDoc._id, skillLevel: s.skillLevel });
      }
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      bio,
      sports: processedSports,
    });

    await newUser.save();

    // 🤖 AI: Detect sports from bio in the background (don't block the response)
    if (bio && bio.trim().length > 0) {
      setImmediate(async () => {
        try {
          const allSports = await Sport.find({});
          const sportNames = allSports.map((s) => s.name);
          const detectedSportNames = await aiService.analyzeBio(
            bio,
            sportNames,
          );
          console.log(
            `[AI Register] Detected sports from bio for ${email}:`,
            detectedSportNames,
          );

          const sportsToAdd = [];
          for (const detectedName of detectedSportNames) {
            const sportDoc = allSports.find(
              (s) => s.name.toLowerCase() === detectedName.toLowerCase(),
            );
            if (sportDoc) {
              const alreadyAdded = newUser.sports.some(
                (s) => s.sport.toString() === sportDoc._id.toString(),
              );
              if (!alreadyAdded) {
                sportsToAdd.push({
                  sport: sportDoc._id,
                  skillLevel: "Beginner",
                });
              }
            }
          }

          if (sportsToAdd.length > 0) {
            await User.findByIdAndUpdate(newUser._id, {
              $push: { sports: { $each: sportsToAdd } },
            });
            console.log(
              `[AI Register] Added ${sportsToAdd.length} sport(s) to ${email} from bio.`,
            );
          }
        } catch (aiErr) {
          console.error(
            "[AI Register] Bio analysis failed silently:",
            aiErr.message,
          );
        }
      });
    }

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res
      .status(201)
      .json({
        token,
        user: { id: newUser._id, name: newUser.name, email: newUser.email },
      });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        sports: user.sports,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("sports.sport");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
