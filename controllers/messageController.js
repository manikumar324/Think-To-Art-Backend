import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import openai from "../configs/openai.js";
import imagekit from "../configs/imageKit.js";


//Text-based AI message controller

export const textMessageController = async (req, res) => {
   console.log("🟢 Text message controller triggered");
  try {
    const userId = req.user.userId;
    // ✅ Fetch user and check credits
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.credits < 1) {
      return res.status(403).json({ success: false, message: "Not enough credits" });
    }
    const { chatId, prompt } = req.body;

    const chat = await Chat.findOne({ _id: chatId, userId });
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
      isImage: false,
    });
//AI response from Gemini API
    const {choices} = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    const reply = {...choices[0].message,timestamp: Date.now(), isImage: false};
    chat.messages.push(reply);
    await chat.save();
    await User.updateOne({_id:userId}, { $inc: { "credits": -1 } });
    console.log("AI Response:- ", reply);
    return res
      .status(200)
      .json({ success: "true", message: "AI Response", reply });     
  } catch (error) {
    console.log("Error in Text Message Controller:- ", error.message);
    return res.status(500).json({ success: "false", message: error.message });
  }
};

//Image Generation message controller
export const imageMessageController = async (req, res) => {
  console.log("🟢 Image message controller triggered");

  try {
    const userId = req.user.userId;

    // ✅ Fetch user and check credits
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.credits < 2) return res.status(403).json({ success: false, message: "Not enough credits" });

    const { chatId, prompt, isPublished } = req.body;

    // ✅ Find the chat
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    // ✅ Push user's message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
      isImage: true,
    });

    // ✅ Generate the ImageKit AI URL (no axios.get)
    const encodedPrompt = encodeURIComponent(prompt);
    const aiImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/thinktoart/${Date.now()}.png?tr=w-800,h-800`;

    // ✅ Assistant reply
    const reply = {
      role: "assistant",
      content: aiImageUrl,
      timestamp: Date.now(),
      isImage: true,
      isPublished,
    };

    chat.messages.push(reply);
    await chat.save();

    // ✅ Deduct credits
    await User.updateOne({ _id: userId }, { $inc: { credits: -2 } });

    console.log("✅ Image generated successfully:", aiImageUrl);
    return res.status(200).json({ success: true, reply });

  } catch (error) {
    console.log("❌ Error in Image Message Controller:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Response data:", error.response.data?.toString());
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};




//This api call is for jusr checking the image generation purpose
// export const testController =  async (req, res) => {
//   try {
//     const prompt = "a cute cat wearing sunglasses";
//     const encodedPrompt = encodeURIComponent(prompt);
//     const url = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/thinktoart/test.png`;

//     const aiRes = await axios.get(url);
//     res.send("✅ AI generation works fine!");
//   } catch (err) {
//     console.error("❌ Test AI error:", err.response?.status, err.response?.data);
//     res.status(500).json({ error: err.response?.data });
//   }
// };
