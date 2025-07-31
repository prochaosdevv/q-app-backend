import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";


// Get Admin Profile
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin?.adminId; 

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// Admin Registration
export const registerAdmin = async (req, res) => {
  const { fullname, email, password, } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      fullname,
      email,
      password: hashedPassword,
    
    });

    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering admin", error });
  }
};

// Admin Login
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ adminId: admin._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        image: admin.image,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};

export const updateAdminPassword = async (req, res) => {
  const adminId = req.admin.adminId;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Old and new passwords are required" });
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedNewPassword;
    await admin.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getUserGrowthData = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const userStats = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
          },
        },
      },
      {
        $project: {
          month: { $month: "$createdAt" },
          accountStatus: 1,
        },
      },
      {
        $group: {
          _id: "$month",
          users: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ["$accountStatus", "Active"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const result = monthNames.map((month, index) => {
      const monthData = userStats.find((m) => m._id === index + 1);
      return {
        month,
        users: monthData ? monthData.users : 0,
        activeUsers: monthData ? monthData.activeUsers : 0,
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("User growth error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



