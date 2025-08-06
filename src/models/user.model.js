import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    fullname: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    bio: {
      type: String,
    },
    username: {
      type: String,
    },
    phone: {
      type: String,
    },
    image: {
      type: String,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String, // 'google' | 'apple' | 'local'
      default: "local",
    },
    providerId: {
      type: String, // ID from Google/apple
    },
    accountStatus: {
      type: String,
      default:"Active"
    },
    subscriptionPlan: {
      type: String,
      default:"Basic"
    },
    sendWelcomeEmail: {
      type: Boolean,
      default:false
    },
     subscriptionExpirydate: {
    type: Date,
  },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
