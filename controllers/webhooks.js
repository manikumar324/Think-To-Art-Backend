import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebHooks = async (req, res) => {
  console.log("⚡ Webhook received");
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log("✔ Stripe signature verified");
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("🔥 Event type:", event.type);

  // 🧠 Handle checkout.session.completed first (most reliable)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { transactionId, appId, userId } = session.metadata || {};

    console.log("🧾 Checkout Metadata:", session.metadata);

    if (!transactionId || appId !== "Quickgpt" || !userId) {
      console.log("❌ Invalid metadata:", session.metadata);
      return res.json({ received: true });
    }

    try {
      let transaction = await Transaction.findById(transactionId);

      if (!transaction) {
        console.log("❌ Transaction not found:", transactionId);
        return res.json({ received: true });
      }

      // ✅ Always update if not paid yet
      if (!transaction.isPaid) {
        transaction.isPaid = true;
        await transaction.save();

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { credits: transaction.credits } },
          { new: true }
        );

        console.log(`✅ User ${updatedUser?._id} credited (+${transaction.credits}) for transaction ${transactionId}`);
      }
    } catch (error) {
      console.error("❌ Error updating transaction/user:", error);
    }
  }

  // ⚙️ Backup for payment_intent.succeeded if checkout.session.completed was missed
  else if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { transactionId, appId, userId } = paymentIntent.metadata || {};

    console.log("💳 Payment Intent Metadata:", paymentIntent.metadata);

    if (!transactionId || appId !== "Quickgpt" || !userId) {
      console.log("❌ Invalid metadata for payment intent:", paymentIntent.metadata);
      return res.json({ received: true });
    }

    try {
      let transaction = await Transaction.findById(transactionId);

      if (!transaction) {
        console.log("❌ Transaction not found:", transactionId);
        return res.json({ received: true });
      }

      if (!transaction.isPaid) {
        transaction.isPaid = true;
        await transaction.save();

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { credits: transaction.credits } },
          { new: true }
        );

        console.log(`✅ [Backup] User ${updatedUser?._id} credited (+${transaction.credits}) for transaction ${transactionId}`);
      }
    } catch (error) {
      console.error("❌ Error updating transaction/user (payment intent):", error);
    }
  }

  res.json({ received: true });
};
