import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    progressReport: {
      type: String,
    },
    weather: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Weather",
    },
    delays: {
      type: Number,
      default: null,
    },
    labour: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Labour",
      }
    ],
    material: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
      }
    ],
    plant: {
      type: String,
    },
    photos: [String],


  },
  { timestamps: true }
);

const DailyReport = mongoose.model("DailyReport", dailyReportSchema);

export default DailyReport;
