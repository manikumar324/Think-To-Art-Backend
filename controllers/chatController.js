//API controller for creating a new chat

import Chat from "../models/Chat.js";
// import User from "../models/User.js";

export const createChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("UserID:- ",userId);
    const userName = req.user.name;
    console.log("UserName:- ",userName);
    // Fetch user from DB to get name
    // const user = await User.findById(userId);
    // if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const newChat = new Chat({
      userId,
      userName, // no need to fetch from DB
      name: "New Chat",
      messages: [],
    });
    await newChat.save();
    console.log("New Chat Created");
    return res
      .status(201)
      .json({ success: "true", message: "New Chat Created", newChat });
  } catch (error) {
    console.log("Error in Creating Chat:- ", error.message);
    return res.status(400).json({ success: "false", message: error.message });
  }
};

//API Controller for getting all chats

export const getAllChats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
    console.log("All Chats :-", chats);
    return res
      .status(200)
      .json({ success: "true", message: "All Chats Displayued", chats });
  } catch (error) {
    console.log("Error displaying Chats", error.message);
    return res.status(500).json({ success: "false", message: error.message });
  }
};

//API controller for deleting Chat

export const deleteChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.body;

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, message: "Chat ID is required" });
    }

    // Delete only if chat belongs to the logged-in user
    const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId });

    if (!deletedChat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or unauthorized to delete",
      });
    }

    console.log("Chat Deleted Successfully");
    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
      deletedChat,
    });
  } catch (error) {
    console.log("Error deleting chat:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting chat",
    });
  }
};
