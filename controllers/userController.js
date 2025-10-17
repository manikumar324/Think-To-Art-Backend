import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({
    debug: false // 👈 disables all those info logs 
});

//API to register user
export const registerUser = async (req, res) => {
    
    try {
        const { name, email, password } = req.body;
        console.log(req.body);

        if(!name || !email || !password) {
            console.log("All Fields Required")
            return res.status(400).json({ success:"false",message: "Please enter all fields" });
        }
        // Check if user already exists
        let existUser = await User.findOne({ email });
        if (existUser) {
            console.log("Email Already Exists")
            return res.status(400).json({ success:"false",message: "User already exists" });
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save();
        // // Create and sign JWT
        // const payload = { userId: newUser._id };
        // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(201).json({success:"true", message:"User Created Successfully" });

    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
}

//API to login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);
        
        if(!email || !password) {
            console.log("All Fields Required")
            return res.status(400).json({ success:"false",message: "Please enter all fields" });
        }
        // Check for existing user
        const alreadyUser = await User.findOne({ email });
        if (!alreadyUser) {
            return res.status(400).json({ success:"false",message: "Invalid credentials" });
        }
        // Validate password
        const isMatch = await bcrypt.compare(password, alreadyUser.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        // Create and sign JWT
        const payload = { userId: alreadyUser._id , name: alreadyUser.name};
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '23h' });
        console.log("token:-",token)
        return res.status(200).json({ success:"true", message:"User LoggedIn Successfully", token, user: { id: alreadyUser._id, name: alreadyUser.name, email: alreadyUser.email } });
    }catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
}

//API to get user data
export const getUserData = async (req, res) => {
    try {
        const userId = req.user.userId; // comes from authMiddleware
        // const user = await User.findById(userId).select('-password'); // fetch user from DB without password
        const user = await User.find(); // fetch all users data
        if (!user) {
            
            return res.status(404).json({ message: "User not found" });
        }
        console.log("User Details :-",user)
        return res.status(200).json(user); // send user data back
    } catch (error) {
        console.log("Error Message:-",error.message)
        return res.status(500).json({ message: "Server Error" });
    }
};


import Chat from "../models/Chat.js";

// Get all published images using aggregation
export const getPublishedImages = async (req, res) => {
  try {
    const userId = req.user.userId;

    const publishedImages = await Chat.aggregate([
      { $match: { userId: userId } }, // Only this user's chats
      { $unwind: "$messages" },       // Flatten messages array
      { $match: { "messages.isImage": true, "messages.isPublished": true } }, // Only published images
      { $project: {
          chatId: "$_id",
          content: "$messages.content",
          timestamp: "$messages.timestamp",
          _id: 0
        }
      },
      { $sort: { timestamp: -1 } } // Optional: newest first
    ]);

    return res.status(200).json({ success: true, images: publishedImages });
  } catch (error) {
    console.log("Error in getPublishedImages (aggregation):", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
