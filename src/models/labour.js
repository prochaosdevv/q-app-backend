// models/Contributor.js
import mongoose from "mongoose";

const labourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
   
    },
    role: {
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

const Labour = mongoose.model("Labour", labourSchema);

export default Labour;
