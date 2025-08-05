
import Transaction from '../models/transaction.js';
import User from '../models/user.model.js';
import SubscriptionPlan from '../models/subscriptionPlan.js';


export const createTransaction = async (req, res) => {
  try {
    const { userId, transactionId, amount, subscriptionPlanId,transactionBody } = req.body;


    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!subscriptionPlan) return res.status(404).json({ message: 'Subscription Plan not found' });

    const newTransaction = new Transaction({
      user: userId,
      transactionId,
      amount,
      transactionBody,
      subscriptionPlan: subscriptionPlanId,
    });

    await newTransaction.save();

    return res.status(201).json({ message: 'Transaction created successfully', transaction: newTransaction });
  } catch (error) {
    console.error('Create Transaction Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({
        path: 'user',
        select: 'fullname email subscriptionPlan subscriptionExpirydate',
        populate: {
          path: 'subscriptionPlan',
          model: 'SubscriptionPlan',
          select: 'planName monthlyPrice yearlyPrice'
        }
      })
      .populate('subscriptionPlan', 'planName monthlyPrice yearlyPrice')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
