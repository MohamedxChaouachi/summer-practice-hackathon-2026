const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinUserRoom", (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined user room ${userId}`);
    });

    socket.on("joinEventRoom", async (eventId) => {
      socket.join(eventId);
      console.log(`Socket ${socket.id} joined room ${eventId}`);

      try {
        // Fetch messages for this event
        const messages = await Message.find({ event: eventId })
          .populate("sender", "name avatar")
          .sort({ createdAt: 1 });

        console.log(`Found ${messages.length} messages for room ${eventId}`);
        // Send history to the specific socket
        socket.emit("messageHistory", messages);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    });

    socket.on("sendMessage", async (data) => {
      console.log("Server received sendMessage:", data);
      try {
        const message = new Message({
          event: data.eventId,
          sender: data.sender.id,
          content: data.content,
        });
        await message.save();
        console.log("Message saved to DB:", message);

        // Broadcast to the room
        console.log("Broadcasting newMessage to room:", data.eventId);
        io.to(data.eventId).emit("newMessage", {
          ...data,
          _id: message._id,
        });

        // Create notifications for other members
        const Event = require("../models/Event");
        const Notification = require("../models/Notification");

        const event = await Event.findById(data.eventId).populate("sport");
        if (event) {
          event.members.forEach(async (memberId) => {
            if (memberId.toString() !== data.sender.id) {
              const msg = `You have new messages in "${event.sport?.name || "Sport"}" event`;

              // Save to DB
              await Notification.create({
                user: memberId,
                message: msg,
                link: `/dashboard`,
              });

              // Emit to user room
              io.to(memberId.toString()).emit("newNotification", {
                message: msg,
              });
            }
          });
        }
      } catch (err) {
        console.error("Failed to save message or send notifications", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
