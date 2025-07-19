import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // required: true,
    },
    desc: {
      type: String,
    },
    unit: {
      type: String,
    },
    qty: {
      type: Number,
      // required: true,
    },
    type: {
      type: String,
    },
  },
  { timestamps: true }
);

const Material = mongoose.model("Material", materialSchema);

export default Material;
