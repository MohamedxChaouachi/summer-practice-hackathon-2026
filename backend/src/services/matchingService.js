const User = require('../models/User');
const Event = require('../models/Event');
const Location = require('../models/Location');

// Matchmaking Algorithm
exports.runMatchmaking = async () => {
  try {
    console.log('Running matchmaking algorithm...');
    
    // 1. Find all users available today
    const availableUsers = await User.find({ 'availability.isAvailableToday': true }).populate('sports.sport');
    
    if (availableUsers.length === 0) {
      return { message: 'No users available for matching today.' };
    }

    // 2. Group by preferred sport
    const sportGroups = {};
    
    availableUsers.forEach(user => {
      if (user.sports && user.sports.length > 0 && user.sports[0].sport) {
        const primarySportId = user.sports[0].sport._id.toString();
        if (!sportGroups[primarySportId]) sportGroups[primarySportId] = { sportDoc: user.sports[0].sport, users: [] };
        sportGroups[primarySportId].users.push(user);
      }
    });

    const matchesCreated = [];

    // 3. For each sport group, create an event if there are enough people
    const MOCK_LOCATIONS = {
        'football': { name: 'Central Park Pitch', lat: 40.7812, lng: -73.9665 },
        'tennis': { name: 'Downtown Tennis Courts', lat: 40.7128, lng: -74.0060 },
        'basketball': { name: 'Westside Hoops', lat: 40.7300, lng: -74.0100 }
    };

    for (const [sportId, group] of Object.entries(sportGroups)) {
      const users = group.users;
      const sportDoc = group.sportDoc;
      
      if (users.length >= 2) {
        // Assign random captain
        const captainIndex = Math.floor(Math.random() * users.length);
        const captain = users[captainIndex];
        
        const memberIds = users.map(u => u._id);
        
        let locationDoc = await Location.findOne({ name: { $regex: new RegExp(`^${sportDoc.name} location$`, 'i') } });
        if (!locationDoc) {
          const mockLoc = MOCK_LOCATIONS[sportDoc.name.toLowerCase()] || { name: `${sportDoc.name} Field`, lat: 0, lng: 0 };
          locationDoc = new Location({ name: mockLoc.name, lat: mockLoc.lat, lng: mockLoc.lng, sportsAllowed: [sportDoc._id] });
          await locationDoc.save();
        }
        
        const newEvent = new Event({
          sport: sportDoc._id,
          status: 'Matched',
          captain: captain._id,
          members: memberIds,
          location: locationDoc._id,
          time: new Date(new Date().setHours(18, 0, 0, 0)) // Today at 6 PM
        });
        
        await newEvent.save();
        
        // Reset availability for these users so they don't get matched again
        await User.updateMany(
            { _id: { $in: memberIds } },
            { $set: { 'availability.isAvailableToday': false } }
        );

        matchesCreated.push(newEvent);
      }
    }
    
    return { 
        message: `Matchmaking complete. Created ${matchesCreated.length} events.`,
        events: matchesCreated
    };
    
  } catch (err) {
    console.error('Matchmaking Error:', err);
    throw err;
  }
};
