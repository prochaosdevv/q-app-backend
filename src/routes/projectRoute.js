const express = require("express");
const { createProject, getProjects, editProjectImage } = require("../controllers/projectController");
const router = express.Router();


// POST /api/project/create
router.post("/create", createProject);

// GET /api/project
router.get("/", getProjects);

// PUT /api/project/edit-image
router.put("/edit-image", editProjectImage);

module.exports = router;
