// models/Contributor.js
import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    permission: {
      type: String,
      enum: ["can view", "can edit"],
      default: "can view",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    referal: {
      type: Boolean,
      default: false,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: Number,
      default: 0,
      //  0 - pending
      //  1 - signup
    },
    invitationStatus: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },

  },
  {
    timestamps: true,
  },
);

const Contributor = mongoose.model("Contributor", contributorSchema);

export default Contributor;
