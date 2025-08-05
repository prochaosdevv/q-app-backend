import express from "express";
import {changePassword, getAllUsers, getUserByEmail, getUserById, loginUser, registerUser, requestOtp, resetPassword, socialAuth, updateUserProfile, verifyOtp } from "../controllers/user.controller.js";
import verifyToken from "../middleware/auth.js";
import { createTransaction, getAllTransactions } from "../controllers/transactionController.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/social", socialAuth);
router.get("/get-user", getAllUsers);
router.get("/get/me",verifyToken, getUserById);
router.get("/user/:email", getUserByEmail);
router.put("/change-password",verifyToken, changePassword);
router.put("/profile/update", verifyToken, updateUserProfile);

// 🟢 OTP / Forgot password flow
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyToken, verifyOtp);
router.post("/reset-password", verifyToken, resetPassword);

router.post("/create/transaction", createTransaction);
router.get("/get/all/transaction", getAllTransactions);






export default router;
