// models/Contributor.js
import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema(
  {
    labour: {
      type: String,
   
    },
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

const Contributor = mongoose.model("Labour", contributorSchema);

export default Contributor;
