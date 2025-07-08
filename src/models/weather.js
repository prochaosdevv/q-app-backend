import mongoose from "mongoose";

const weatherSchema = new mongoose.Schema(
  {
    condition: { // e.g. Sunny, Rainy, Cloudy
      type: String,
      // required: true,
    },
    temperature: { // e.g. 30°C
      type: Number,
    },
    humidity: {
      type: Number,
    },
    windSpeed: {
      type: Number,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

const Weather = mongoose.model("Weather", weatherSchema);

export default Weather;
