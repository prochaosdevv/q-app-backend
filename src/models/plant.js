// models/Contributor.js
import mongoose from "mongoose";

const plantSchema = new mongoose.Schema(
  {
    desc: {
      type: String,
    },
    qty: {
    type: Number,
    },
  },
  {
    timestamps: true,
  },
);

const Plant = mongoose.model("Plant", plantSchema);

export default Plant;
