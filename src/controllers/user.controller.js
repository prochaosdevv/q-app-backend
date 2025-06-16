import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

dotenv.config();

const registerUser = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required...!!",
      });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({
        success: false,
        message: "Email already registered...!!",
      });

    const newUser = await User.create({ fullname, email, password });
    res.status(201).json({
      success: true,
      message: "User registered successfully...!!",
      user: {
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        password: newUser.password,
      },
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error...!!",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required...!!",
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "User logged in successfully...!!",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        // other fields if needed
      },
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error...!!",
    });
  }
};

const geAlltUser = async (req, res) => {
  try {
    const users = await User.find();
    res.status(201).json({
      success: true,
      message: "Users fetched successfully...!!",
      users,
    });
  } catch (error) {
    console.error("Staff fetching error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error...!!",
    });
  }
};

export { registerUser, loginUser, geAlltUser };
