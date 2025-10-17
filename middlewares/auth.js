import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // get token from header
    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // verify JWT token
        console.log("Decoded JWT:", decoded); // 🔥 add this line
        req.user = decoded; // attach the decoded payload (like userId) to request
        next(); // continue to the actual route handler
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};
