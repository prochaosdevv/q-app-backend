import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import formidable from "formidable";
import User from "../models/user.model.js";
import Otp from "../models/otp.js";
import { sendEmail } from "./emailController.js";
import AWS from "aws-sdk";
import fs from "fs";
import Contributor from "../models/contributor.js";

dotenv.config();

const s3Client = new AWS.S3({
  secretAccessKey: process.env.ACCESS_KEY,
  accessKeyId: process.env.ACCESS_ID,
  region: process.env.region,
});

// Helper to upload a file to S3
const uploadToS3 = async (file) => {
  const fileContent = fs.readFileSync(file.filepath);

  const upload = await s3Client
    .upload({
      Bucket: process.env.IMAGE_BUCKET,
      Key: `daily-reports/${Date.now()}-${file.originalFilename}`,
      Body: fileContent,
      ContentType: file.mimetype,
    })
    .promise();

  return upload.Location;
};

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

    const contributors = await Contributor.find({ email });

    for (const contributor of contributors) {
      contributor.userId = newUser._id;
      contributor.status = 1; // signup
      await contributor.save();
    }

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
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
      contributor: contributor || null,
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

    // console.log(email, password);

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
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
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

// ADD new user
const createNewUser = async (req, res) => {
  try {
    const { fullname, email, password, subscriptionPlan, accountStatus } =
      req.body;

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
      subscriptionPlan,
      accountStatus,
      sendWelcomeEmail: true,
    });

    // Send welcome email with credentials
    await sendEmail(
      email,
      "Welcome to Quentessential – Your Login Credentials",
      `Hello ${fullname},

Welcome to Quentessential!

Your account has been successfully created. Here are your login credentials:

Email: ${email}
Password: ${password}

We recommend logging in and updating your password immediately for security reasons.

Thank you for joining us!

Best regards,  
The Quentessential Team`,
      `<p>Hello ${fullname},</p>
      <p>Welcome to <strong>Quentessential</strong>! Your account has been successfully created.</p>
      <p><strong>Login credentials:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>We highly recommend logging in and updating your password right away for security.</p>
      <p>Thank you for joining us!</p>
      <p>Best regards,<br/><strong>The Quentessential Team</strong></p>`,
    );

    res.status(201).json({
      success: true,
      message: "User registered and welcome email sent!",
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

    // Check if user exists with same provider and providerId
    let user = await User.findOne({ provider, providerId });

    // If not, check if email already exists with a different provider
    if (!user) {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "Email already exists. Please use the original login method.",
        });
      }

      // Create new user
      user = new User({
        email,
        provider,
        providerId,
        fullname,
        image,
        profileCompleted: false,
        verified: true,
      });

      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
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
    console.error("Social auth error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required...!!",
      });
    }

    const user = await User.findOne({ email }).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with provided email.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    console.error("Get user by email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error...!!",
    });
  }
};

// changePassword
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required.",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// 1️⃣ Request OTP
const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email.",
      });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    await Otp.create({
      user: user._id,
      otp: otpCode,
      status: "pending",
    });

    const otpToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2m",
    });

    await sendEmail(
      user.email,
      "Your OTP for Password Reset",
      `Hello,

We received a request to reset your password. Use the following OTP: ${otpCode}

This OTP is valid for 2 minutes. If you did not request this, please ignore this email.

Thank you,
The Quentessential Team`,
      `<p>Hello,</p>
  <p>We received a request to reset your password. Please use the one-time password (OTP) below to proceed:</p>
  <p style="font-size: 16px; font-weight: bold;">${otpCode}</p>
  <p>This OTP is valid for <strong>2 minutes</strong>. If you did not request this, please ignore this email.</p>
  <p>Thank you,<br/>The Quentessential Team</p>`,
    );

    res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      token: otpToken,
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// 2️⃣ Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required.",
      });
    }

    const userId = req.user.userId;

    const otpRecord = await Otp.findOne({
      user: userId,
      otp,
      status: "pending",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// 3️⃣ Reset Password
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required.",
      });
    }

    const userId = req.user.userId;

    const otpRecord = await Otp.findOne({
      user: userId,
      status: "pending",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not verified or expired.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    otpRecord.status = "used";
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Form parsing error.",
      });
    }

    try {
      const userId = req.user.userId;
      const { fullname, username, bio } = fields;

      let updateFields = {
        fullname,
        username,
        bio,
        profileCompleted: true,
      };

      if (files.image) {
        const imageUrl = await uploadToS3(files.image);
        updateFields.image = imageUrl;
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  });
};

export {
  registerUser,
  loginUser,
  getAllUsers,
  socialAuth,
  getUserByEmail,
  changePassword,
  requestOtp,
  verifyOtp,
  resetPassword,
  updateUserProfile,
  createNewUser,
};
