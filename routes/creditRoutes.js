
import express from 'express';
import { getPlans, purchasePlan } from '../controllers/creditController.js';
import { authMiddleware } from '../middlewares/auth.js';

const creditRouter = express.Router();

creditRouter.get('/plan',getPlans)
creditRouter.post('/purchase', authMiddleware,purchasePlan)

export default creditRouter;