const express = require("express");
const { createProject } = require("../controllers/projectController");
const router = express.Router();


// POST /api/projects
router.post("/projects", createProject);

module.exports = router;
