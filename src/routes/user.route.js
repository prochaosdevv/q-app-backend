import express from "express";
import {changePassword, createNewUser, getAllUsers, getUserByEmail, loginUser, registerUser, requestOtp, resetPassword, socialAuth, updateUserProfile, verifyOtp } from "../controllers/user.controller.js";
import verifyToken from "../middleware/auth.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/social", socialAuth);
router.get("/get-user", getAllUsers);
router.get("/user/:email", getUserByEmail);
router.put("/change-password",verifyToken, changePassword);
router.put("/profile/update", verifyToken, updateUserProfile);

// 🟢 OTP / Forgot password flow
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyToken, verifyOtp);
router.post("/reset-password", verifyToken, resetPassword);



///Admin 
router.post("/create/user", createNewUser);



export default router;
