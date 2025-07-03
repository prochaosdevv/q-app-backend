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
      type: String,
    },
    delays: {
      type: Number, // in hours
      default: 0,
    },
    labour: {
      type: String,
    },
    material: {
      type: String,
    },
    plant: {
      type: String,
    },
  },
  { timestamps: true },
);

const DailyReport = mongoose.model("DailyReport", dailyReportSchema);

export default DailyReport;
