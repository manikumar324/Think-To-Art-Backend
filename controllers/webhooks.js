
import { request } from "express";
import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

export const stripeWebHooks = async (req, res)=>{
    const stripe = new stripe(process.env.STRIPE_SECRET_KEY)
    const sig = request.headers['stripe-signature']

    let event;

    try{
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    }
    catch(error){
        return res.status(400).json({success : "false", "Webhook Error":error.message})
    }
    try{
        switch(event.type){
            case "payment.intent.succeeded" :{
                const paymentIntent = event.data.object;
                const sessionList = await stripe.checkout.sessions.list({
                    payment_intent : paymentIntent.id,
                })
                const session = sessionList.data[0];
                const {transactionId, appId} = session.metadata;

                if(appId === "Quickgpt"){
                    const transaction = await Transaction.findOne({
                        _id : transactionId,
                        isPaid : false
                    }) 

                    //updated credits in user account
                    await User.updateOne({_id : transaction.userId},{ $inc :{credits: transaction.credits }})

                    //update credit payment status
                    transaction.isPaid = true 
                    await transaction.save();
                }else{
                        return res.json({received: true, message : "Ignored event : Invalid app"})
                }
                 break;
            }

            default:
                console.log("Unhandled event type:", event.type)
                break;
        }
        return res.json({received : true})
    }
    catch(error){
        console.error("Webhook processing error", error)
        res.status(500).json({message: "Internal Server Error"})
    }
}