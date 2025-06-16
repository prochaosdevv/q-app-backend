import express from "express";
import { geAlltUser, loginUser, registerUser } from "../controllers/user.controller.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/get-user", geAlltUser);

export default router;
