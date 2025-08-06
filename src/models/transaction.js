import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    transactionBody: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
    },
    subscriptionPlan: {
     type: String,
    },
    invoiceBuffer: {
     type: String,
    },
    
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
