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

    // Push user message to chat
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
      isImage: false,
    });

    // ✅ Setup streaming response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // ✅ Stream AI response
    const stream = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk?.choices?.[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;

        // Send raw text chunks (no JSON)
        res.write(content);
      }
    }

    // ✅ End of stream
    res.end();

    // ✅ Save AI reply in DB
    const reply = {
      role: "assistant",
      content: fullResponse,
      timestamp: Date.now(),
      isImage: false,
    };
    chat.messages.push(reply);
    await chat.save();

    // ✅ Deduct credits
    await User.updateOne({ _id: userId }, { $inc: { credits: -1 } });

    console.log("✅ AI Response completed:", fullResponse.slice(0, 50) + "...");
  } catch (error) {
    console.log("❌ Error in Text Message Controller:", error.message);
    res.status(500).json({ success: false, message: error.message });
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
    const aiImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/MyNewProject/${Date.now()}.png?tr=w-800,h-800`;

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
