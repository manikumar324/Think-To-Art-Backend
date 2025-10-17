
import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { imageMessageController, textMessageController } from '../controllers/messageController.js';
const messageRouter = express.Router();

messageRouter.post('/text', authMiddleware, textMessageController)
messageRouter.post('/image', authMiddleware, imageMessageController)


export default messageRouter;