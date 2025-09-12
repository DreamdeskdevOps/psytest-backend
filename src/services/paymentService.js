// src/services/paymentService.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Function to create a payment intent with Stripe
const createStripePaymentIntent = async (amount, currency = 'usd') => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });
    return paymentIntent;
  } catch (error) {
    throw new Error(`Stripe Payment Intent Error: ${error.message}`);
  }
};

// Function to create an order with Razorpay
const createRazorpayOrder = async (amount, currency = 'INR') => {
  try {
    const options = {
      amount,
      currency,
      receipt: `receipt_order_${Math.floor(Math.random() * 10000)}`,
    };
    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    throw new Error(`Razorpay Order Creation Error: ${error.message}`);
  }
};

// Function to verify the payment signature for Razorpay
const verifyRazorpayPayment = (paymentId, orderId, signature) => {
  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  return generatedSignature === signature;
};

module.exports = {
  createStripePaymentIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
};