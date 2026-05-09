require("dotenv").config();
const mongoose = require("mongoose");
const Sport = require("../src/models/Sport");
const aiService = require("../src/services/aiService");

const MONGO_URI = process.env.MONGO_URI;

const seedSports = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    console.log("Asking Groq to generate 100 sports...");
    const generatedSports = await aiService.generateSports();

    console.log(
      `Received ${generatedSports.length} sports. Inserting into database...`,
    );

    let insertedCount = 0;
    let skippedCount = 0;

    for (const sport of generatedSports) {
      if (!sport.name) continue;

      // Check if sport already exists
      const existing = await Sport.findOne({
        name: { $regex: new RegExp(`^${sport.name}$`, "i") },
      });

      if (!existing) {
        await Sport.create({
          name: sport.name,
          groupSizeMin: sport.groupSizeMin || 2,
          groupSizeMax: sport.groupSizeMax || 14,
        });
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Seeding complete!`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Skipped (already existed): ${skippedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
};

seedSports();
