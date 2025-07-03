import express from "express";
import {getAllUsers, getUserByEmail, loginUser, registerUser, socialAuth } from "../controllers/user.controller.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/social", socialAuth);
router.get("/get-user", getAllUsers);
router.get("/user/:email", getUserByEmail);


export default router;
