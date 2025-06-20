import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    // unique: true,
  },
  permission: {
    type: String,
    enum: ["can view", "can edit"],
    default: "can view",
  },
});

const projectSchema = new mongoose.Schema(
  {
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
    contributors: [contributorSchema],
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
