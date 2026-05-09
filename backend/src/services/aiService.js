const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.1-8b-instant";

// Helper: call Groq and get the text response
const generate = async (prompt) => {
  const chat = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.7,
    max_tokens: 4096,
  });
  return chat.choices[0].message.content;
};

exports.generateSports = async () => {
  try {
    const prompt = `Generate a JSON array of exactly 100 different sports from around the world. 
        Return ONLY a valid JSON array. No explanation, no markdown, no code blocks.
        Each element must follow this exact shape:
        { "name": "Sport Name", "groupSizeMin": 2, "groupSizeMax": 14 }
        Include mainstream and niche sports (football, tennis, kabaddi, sepak takraw, etc).
        Only output the raw JSON array.`;

    const text = await generate(prompt);
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Sports Generation Error:", error);
    throw error;
  }
};

exports.analyzeBio = async (bio, availableSports) => {
  try {
    const prompt = `You are a sports matching assistant.
User bio: "${bio}"
Available sports: ${availableSports.join(", ")}

Extract the sports the user is interested in from their bio. Only include sports from the available list.
Return ONLY a raw JSON array of sport name strings, no markdown. Example: ["Football", "Tennis"]`;

    const text = await generate(prompt);
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Bio Analysis Error:", error);
    return [];
  }
};

exports.analyzePhoto = async (imageBuffer, mimeType, availableSports) => {
  // Note: Groq's free tier doesn't support vision yet, so we skip photo analysis gracefully
  console.log("Photo analysis not supported on free Groq tier — skipping.");
  return [];
};

exports.calculateCompatibility = async (user1, user2) => {
  try {
    const prompt = `You are an AI sports matchmaking assistant.
User 1: ${JSON.stringify(user1)}
User 2: ${JSON.stringify(user2)}

Calculate a teammate compatibility score from 0 to 100 based on shared sports, skill levels, and bios.
Provide a brief encouraging 1-sentence reason.

Return ONLY this raw JSON, no markdown:
{"score": 85, "reason": "You both enjoy Intermediate Tennis and could make a great doubles team!"}`;

    const text = await generate(prompt);
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Compatibility Score Error:", error);
    return { score: 0, reason: "Unable to calculate compatibility." };
  }
};

exports.suggestEvent = async (users, availableSports) => {
  try {
    const usersData = users.map(u => ({
      name: u.name,
      interests: u.sports.map(s => s.sport.name),
      location: `${u.city}, ${u.country}`,
      bio: u.bio
    }));

    const prompt = `You are a sports matchmaking AI.
Available Sports: ${availableSports.map(s => s.name).join(", ")}
Users wanting to play: ${JSON.stringify(usersData)}

Based on these users' interests, location, and bios, suggest the ONE best sport they should play together today and a creative name for the location where they should meet.
The sport MUST be from the Available Sports list.
Pick a city that is common to most users if they are in the same area.

Return ONLY this raw JSON, no markdown:
{
  "sportName": "Sport Name",
  "locationName": "Location Name",
  "reason": "Brief explanation why this was chosen"
}`;

    const text = await generate(prompt);
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Event Suggestion Error:", error);
    return null;
  }
};

