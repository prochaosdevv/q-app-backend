import express from "express";
import {changePassword, getAllUsers, getUserByEmail, loginUser, registerUser, requestOtp, resetPassword, socialAuth, verifyOtp } from "../controllers/user.controller.js";
import verifyToken from "../middleware/auth.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/social", socialAuth);
router.get("/get-user", getAllUsers);
router.get("/user/:email", getUserByEmail);
router.put("/change-password",verifyToken, changePassword);

// 🟢 OTP / Forgot password flow
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyToken, verifyOtp);
router.post("/reset-password", verifyToken, resetPassword);



export default router;
