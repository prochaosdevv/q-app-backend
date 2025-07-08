// models/Project.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
  dailyLogCompleted: {
  type: Boolean,
  default: false
},
reportSent: {
  type: Boolean,
  default: false
},
  },
  {
    timestamps: true,
  },
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
