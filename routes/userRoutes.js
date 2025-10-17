
import express from "express";
import { registerUser, loginUser,getUserData, getPublishedImages } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/auth.js";
const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/login", loginUser);
userRoutes.get("/userdetails",authMiddleware, getUserData);
userRoutes.get('/publishedImages', authMiddleware, getPublishedImages)

export default userRoutes;