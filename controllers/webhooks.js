import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebHooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = sig
      ? stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
      : req.body;
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Webhook event type:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { transactionId, appId, userId } = session.metadata || {};

    if (!transactionId || !appId || !userId) {
      console.log("❌ Invalid metadata:", session.metadata);
      return res.json({ received: true });
    }

    try {
      // 1️⃣ Mark transaction as paid
      const transaction = await Transaction.findOneAndUpdate(
        { _id: transactionId, isPaid: false },
        { $set: { isPaid: true } },
        { new: true }
      );

      if (!transaction) {
        console.log("❌ Transaction not found or already paid:", transactionId);
        return res.json({ received: true });
      }

      // 2️⃣ Increment user credits
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { credits: transaction.credits } },
        { new: true }
      );

      if (!updatedUser) {
        console.log("❌ User not found:", userId);
        return res.status(500).json({ message: "User not found" });
      }

      console.log(`✅ Transaction ${transactionId} paid, user ${updatedUser._id} credits updated (+${transaction.credits})`);
    } catch (err) {
      console.error("Error updating transaction/user:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.json({ received: true });
};
