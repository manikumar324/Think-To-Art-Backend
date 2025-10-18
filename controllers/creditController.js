import Transaction from "../models/Transaction.js";
import Stripe from "stripe";

const plans = [
  {
    _id: "basic",
    name: "Basic",
    price: 10,
    credits: 100,
    features: [
      "100 text generations",
      "50 image generations",
      "Standard support",
      "Access to basic models",
    ],
  },
  {
    _id: "pro",
    name: "Pro",
    price: 20,
    credits: 500,
    features: [
      "500 text generations",
      "200 image generations",
      "Priority support",
      "Access to pro models",
      "Faster response time",
    ],
  },
  {
    _id: "premium",
    name: "Premium",
    price: 30,
    credits: 1000,
    features: [
      "1000 text generations",
      "500 image generations",
      "24/7 VIP support",
      "Access to premium models",
      "Dedicated account manager",
    ],
  },
];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const getPlans = async (req, res) => {
  try {
    return res.json({ success: true, plans });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const purchasePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId; // From auth middleware
    const plan = plans.find((p) => p._id === planId);

    if (!plan) return res.json({ success: false, message: "Invalid Plan" });

    // 1️⃣ Create transaction first
    const transaction = await Transaction.create({
      userId,
      planId: plan._id,
      amount: plan.price,
      credits: plan.credits,
      isPaid: false,
    });

    // 2️⃣ Create Stripe Checkout session
    const origin = req.headers.origin.replace(/\/$/, ""); // remove trailing slash
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.price * 100,
            product_data: { name: plan.name },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/loading`,
      cancel_url: `${origin}`,
      // 👇 THIS IS THE IMPORTANT PART
      payment_intent_data: {
        metadata: {
          transactionId: transaction._id.toString(),
          userId: req.user.userId,
          appId: "Quickgpt",
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Purchase Plan Error:", error);
    return res.json({ success: false, message: error.message });
  }
};
