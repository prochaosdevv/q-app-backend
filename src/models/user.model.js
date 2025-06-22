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
    gender: {
      type: String,
    },
    country: {
      type: String,
    },
    dob: {
      type: String,
    },
    image: {
      type: String,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    verified: {
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
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
