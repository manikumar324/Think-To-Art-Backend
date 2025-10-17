import express from 'express';
// import bodyParser from 'body-parser';
import cors from 'cors';    
import dotenv from 'dotenv';
import connectDB from './configs/db.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import creditRouter from './routes/creditRoutes.js';
import { stripeWebHooks } from './controllers/webhooks.js';

dotenv.config();

const app = express();

await connectDB();

//Stripe Webhooks
app.post('/api/stripe', express.raw({type : 'application/json'}), stripeWebHooks)

//middleware

app.use(cors());
app.use(express.json());

//Routes
app.get('/', (req, res) => {
    res.send("Server is LIVE 🥳");
});
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use('/api/message',messageRouter);
app.use('/api/credit',creditRouter)

//listen
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}👍`);
});