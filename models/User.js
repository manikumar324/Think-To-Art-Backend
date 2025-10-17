import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true},
    password: { type: String, required: true,unique: true },
    credits: { type: Number, default: 20 },
    date: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema);

export default User;