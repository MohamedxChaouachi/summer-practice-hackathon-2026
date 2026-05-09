const User = require('../models/User');
const Event = require('../models/Event');
const Sport = require('../models/Sport');
const Location = require('../models/Location');
const Notification = require('../models/Notification');
const aiService = require('./aiService');

let isJobRunning = false;

exports.initEventJob = (io) => {
    console.log('Initializing AI Event Creator Job (every 10s)...');
    
    setInterval(async () => {
        if (isJobRunning) return;
        isJobRunning = true;

        try {
            // 1. Check if there are no events scheduled for today (simplified check)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const eventsToday = await Event.countDocuments({
                time: { $gte: today, $lt: tomorrow }
            });

            // 2. Find people available "I am in" (isAvailableToday: true)
            const availableUsers = await User.find({ 'availability.isAvailableToday': true }).populate('sports.sport');

            console.log(`[Job] Events today: ${eventsToday}, Available users: ${availableUsers.length}`);

            // Group users by location
            const groupedUsers = {};
            availableUsers.forEach(user => {
                const key = `${user.city || 'Unknown'}_${user.country || 'Unknown'}`;
                if (!groupedUsers[key]) groupedUsers[key] = [];
                groupedUsers[key].push(user);
            });

            const allSports = await Sport.find({});

            for (const key in groupedUsers) {
                const group = groupedUsers[key];
                if (group.length >= 2) {
                    console.log(`[Job] Conditions met for group ${key}! Fetching AI recommendation...`);
                    const aiRecommendation = await aiService.suggestEvent(group, allSports);

                    if (aiRecommendation) {
                        console.log(`[Job] AI Suggested for ${key}: ${aiRecommendation.sportName} at ${aiRecommendation.locationName}`);

                        // Find or create the sport
                        let sport = await Sport.findOne({ name: aiRecommendation.sportName });
                        if (!sport) {
                            sport = await Sport.create({ name: aiRecommendation.sportName });
                        }

                        // Find or create location
                        let location = await Location.findOne({ name: aiRecommendation.locationName });
                        if (!location) {
                            location = await Location.create({
                                name: aiRecommendation.locationName,
                                lat: 0, // Mock lat
                                lng: 0, // Mock lng
                                sportsAllowed: [sport._id]
                            });
                        }

                        // Generate a random 6-character join code
                        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

                        // Create the event
                        const newEvent = await Event.create({
                            sport: sport._id,
                            status: 'Matched',
                            members: [], // No one is a member yet, everyone must join with code
                            location: location._id,
                            joinCode: joinCode,
                            time: new Date(new Date().setHours(19, 0, 0, 0)) // Today at 7 PM
                        });

                        console.log(`[Job] Created AI-driven event for ${key}: ${newEvent._id} with Join Code: ${joinCode}`);

                        // Notify users in this group
                        const broadcastMessage = `AI found a match in ${key.split('_')[0]}! Play ${aiRecommendation.sportName} at ${aiRecommendation.locationName}. Join with code: ${joinCode}.`;
                        
                        for (const user of group) {
                            await Notification.create({
                                user: user._id,
                                message: broadcastMessage,
                                link: `/dashboard`
                            });
                        }

                        if (io) {
                            // Emit only to users in this specific group
                            group.forEach(user => {
                                io.to(user._id.toString()).emit('newNotification', {
                                    message: broadcastMessage,
                                    eventId: newEvent._id,
                                    joinCode: joinCode
                                });
                            });
                        }

                        // Reset availability for these users
                        await User.updateMany(
                            { _id: { $in: group.map(u => u._id) } },
                            { $set: { 'availability.isAvailableToday': false } }
                        );
                    }
                }
            }
        } catch (error) {
            console.error('[Job] Error in event creation job:', error);
        } finally {
            isJobRunning = false;
        }
    }, 10000); // 10 seconds
};
