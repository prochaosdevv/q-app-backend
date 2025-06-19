import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

dotenv.config();

// Register User
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
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered...!!",
      });
    }

      // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullname,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully...!!",
      token,
      user: {
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
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

// Login User
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
    
       // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      success: true,
      message: "User logged in successfully...!!",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
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

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // exclude password
    res.status(200).json({
      success: true,
      message: "Users fetched successfully...!!",
      users,
    });
  } catch (error) {
    console.error("User fetching error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error...!!",
    });
  }
};


const socialAuth = async (req, res) => {
  try {
    const { email, provider, providerId, fullname, image } = req.body;

    if (!email || !provider || !providerId || !fullname) {
      return res.status(400).json({
        success: false,
        message: "Missing required social auth data.",
      });
    }

    let user = await User.findOne({ provider, providerId });

    if (!user) {
      user = new User({
        email,
        provider,
        providerId,
        fullname,
        image,
        password: undefined,
        profileCompleted: false,
        verified: true,
      });

      await user.save({ validateBeforeSave: true });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      success: true,
      message: "Social login successful.",
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        provider: user.provider,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error("Social auth error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};



export { registerUser, loginUser, getAllUsers,socialAuth };
