
import Transaction from '../models/transaction.js';
import User from '../models/user.model.js';
import SubscriptionPlan from '../models/subscriptionPlan.js';
import { sendEmail, sendInvoiceEmail } from './emailController.js';
import Setting from '../models/setting.js';
import fs from 'fs/promises';
import { createInvoicePDFBuffer } from '../utils/invoiceGenerator.js';


export const createTransaction = async (req, res) => {
  try {
    const { userId, transactionId, amount, subscriptionPlan, transactionBody } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: 'Settings not configured' });

    // Update User Subscription Expiry Date
    const currentExpiry = user.subscriptionExpirydate ? new Date(user.subscriptionExpirydate) : new Date();
    const today = new Date();
    const baseDate = currentExpiry > today ? currentExpiry : today;
    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);

    user.subscriptionPlan = subscriptionPlan;
    user.subscriptionExpirydate = newExpiryDate;
    await user.save();

    // Generate Invoice PDF Buffer
    const invoiceBuffer = await createInvoicePDFBuffer({
      companyName: settings.appName,
      invoiceNo: transactionId,
      invoiceDate: new Date(),
      customerName: user.fullname,
      description: "One month Basic plan",
      amount: amount,
      address: settings.address,
    });

    // Convert PDF Buffer to Base64 String
    const invoiceBase64 = invoiceBuffer.toString('base64');

    // Save Transaction in DB
    const transaction = new Transaction({
      user: userId,
      transactionId: transactionId,
      amount: amount,
      subscriptionPlan: subscriptionPlan,
      transactionBody: transactionBody,
      status: "Success",
      invoiceBuffer: invoiceBase64,
    });

    await transaction.save();

    // Send Invoice Email with PDF Buffer as Attachment
    await sendInvoiceEmail(
      user.email,
      "Subscription Invoice - Quentessential",
      `Hello ${user.fullname},\n\nPlease find your subscription invoice attached.\n\nBest regards,\nQuentessential Team`,
      `<p>Hello ${user.fullname},</p><p>Please find your subscription invoice attached.</p><p>Best regards,<br/>Quentessential Team</p>`,
      invoiceBuffer
    );

    return res.status(201).json({ message: 'Transaction created, invoice saved & email sent successfully' });

  } catch (error) {
    console.error('Create Transaction Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};





export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({
        path: "user",
        select: "fullname email subscriptionPlan subscriptionExpirydate",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

