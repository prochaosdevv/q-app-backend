import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      required: true,
    },
    appURL: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    isMaintenanceMode: {
      type: Boolean,
      default: false,
    },
    isUserAllowRegistration: {
      type: Boolean,
      default: true,
    },
    isNotifyNewUser: {
      type: Boolean,
      default: true,
    },
    isNotifySubscriptionChange: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
