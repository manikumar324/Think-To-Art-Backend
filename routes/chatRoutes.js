
import express from "express";
import { createChat,getAllChats,deleteChat } from "../controllers/chatController.js";
import { authMiddleware } from "../middlewares/auth.js";

const chatRoutes = express.Router();

chatRoutes.post("/create",authMiddleware, createChat);
chatRoutes.get("/getAllChats",authMiddleware, getAllChats);
chatRoutes.delete("/delete",authMiddleware, deleteChat);


export default chatRoutes;