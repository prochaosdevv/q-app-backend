import mongoose from "mongoose";

const connectDB = async () => {
  const uri = "mongodb+srv://" + process.env.DB_USER + ":" + process.env.DB_PASSWORD + "@" + process.env.DB_URI + "/"+process.env.DB_NAME+"?retryWrites=true&w=majority";
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB is connected...!!");
  } catch (error) {
    console.error("❌ MongoDB connection failed...!!", error);
    process.exit(1);
  }
};

export default connectDB;
