import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import openai from "../configs/openai.js";
import imagekit from "../configs/imageKit.js";


//Text-based AI message controller

export const textMessageController = async (req, res) => {
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
  try {
    const userId = req.user.userId;
    //check credits
    // ✅ Fetch user and check credits
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.credits < 2) {
      return res.status(403).json({ success: false, message: "Not enough credits" });
    }
    const { chatId, prompt,isPublished } = req.body;
    //To find the particular chat
    const chat = await Chat.findOne({ _id: chatId, userId });
    //Push User message to chat
    chat.messages.push({
      role: "user",
        content: prompt,
        timestamp: Date.now(),
        isImage: true,
    });
   //encode the prompt to base64
   const encodedPrompt = encodeURIComponent(prompt);

   //construct the ImageKit AI generation URL
   const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/thinktoart/${Date.now()}.png?tr=w-800,h-800`;

   // Terigger generation by fetching the ImageKit URL
   const aiImageResponse = await axios.get(generatedImageUrl, {responseType: 'arraybuffer'});

   // convert to base 64
   const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data,"binary").toString('base64')}`;

   //Upload to ImageKit Media Library
   const uploadResponse = await imagekit.upload({
    file : base64Image,
    fileName : `${Date.now()}.png`,
    folder : "thinktoart"
   })
   const reply={
        role: "assistant",
        content : uploadResponse.url,
        timestamp : Date.now(),
        isImage : true,
        isPublished
    }

   chat.messages.push(reply)
   await chat.save();
   await User.updateOne({_id:userId}, { $inc: { "credits": -2 } });
    return res.status(200).json({success : true, reply})

  } catch (error) {
    console.log("Error in Image Message Controller:- ", error.message);
    return res.status(500).json({ success: "false", message: error.message });
  }
};