import express from "express";
import {
  createProject,
  editProjectImage,
  getProjects,
} from "../controllers/projectController.js";

const router = express.Router();

// POST /api/project/create
router.post("/create", createProject);

// GET /api/project
router.get("/", getProjects);

// PUT /api/project/edit-image
router.put("/edit-image", editProjectImage);

export default router;
