import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";


// ⚠ stripe must be initialized here, before using it anywhere
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebHooks = async (req, res) => {
  console.log("⚡ Webhook received");
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (sig) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("✔ Stripe signature verified");
    } else {
      event = req.body;
      console.log("⚡ Test POST received (signature skipped)");
    }
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("🔥 Event type:", event.type || "TEST_EVENT");
  console.log("Metadata:", event.data?.object?.metadata || event.metadata || {});

  if (event.type === "checkout.session.completed" || event.type === "TEST_EVENT") {
    const session = event.data?.object || event;
    const { transactionId, appId } = session.metadata || {};

    if (!transactionId || appId !== "Quickgpt") {
      console.log("❌ Invalid metadata or appId:", session.metadata);
      return res.json({ received: true });
    }

    try {
      // Atomically mark transaction as paid
      const transaction = await Transaction.findOneAndUpdate(
        { _id: transactionId, isPaid: false },
        { $set: { isPaid: true } },
        { new: true }
      );

      if (!transaction) {
        console.log("❌ Transaction not found or already paid:", transactionId);
        return res.json({ received: true });
      }

      // Increment user credits
      const updatedUser = await User.findOneAndUpdate(
        { _id: transaction.userId },
        { $inc: { credits: transaction.credits } },
        { new: true }
      );

      if (!updatedUser) {
        console.log("❌ User not found:", transaction.userId);
        return res.status(500).json({ message: "User not found" });
      }

      console.log(
        `✅ Transaction ${transactionId} marked as paid and user ${updatedUser._id} credits updated (+${transaction.credits})`
      );
    } catch (err) {
      console.error("❌ Error updating transaction/user:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.json({ received: true });
};
