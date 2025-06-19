const mongoose = require("mongoose");

const contributorSchema = new mongoose.Schema({
  email: { type: String, required: true },
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
    description: String,
    image: String, // S3 image URL
    contributors: [contributorSchema],
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
