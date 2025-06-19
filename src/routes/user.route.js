import express from "express";
import {getAllUsers, loginUser, registerUser, socialAuth } from "../controllers/user.controller.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/social", socialAuth);
router.get("/get-user", getAllUsers);


export default router;
