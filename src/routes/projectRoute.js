import express from "express";
import {
  createProject,
  getProjects,
  signupContributor,
  acceptInvitation,
  declineInvitation,
  getContributorsByProject,
  addContributorsToProject,
  getProjectById,
  markProjectReportAsSent,
  markProjectDailyLogStatus,
  archiveProject,
  deleteProject
} from "../controllers/projectController.js";
import verifyToken from "../middleware/auth.js";
import { createDailyReport, delaySuggestion, deleteDailyReport, getPastReportsByProject, getReportById, getReportsByProject, updateDailyReport } from "../controllers/dailyReportController.js";
import { createWeeklyGoal, deleteWeeklyGoal, getDailyReportsByWeeklyGoal, getWeeklyGoalById, getWeeklyGoalsByProjectId, updateWeeklyGoal } from "../controllers/weeklyGoalController.js";

const router = express.Router();

// POST /api/project/create
router.post("/create",verifyToken, createProject);

// POST /api/add-contributor
router.post("/add-contributors", addContributorsToProject);

// GET /api/project
router.get("/",verifyToken, getProjects);

// Route to archive a project (status: 2 = archived)
router.put("/archive/by/:projectId", verifyToken, archiveProject);

// Route to delete a project and related data
router.delete("/delete/by/:projectId", verifyToken, deleteProject);


// GET /api/project/by/id
router.get("/:projectId", getProjectById);
router.put("/mark-sent/:projectId", markProjectReportAsSent);



// POST /api/project/signup-contributor
router.post("/signup-contributor", signupContributor);

// POST /api/project/accept-invitation
router.post("/accept-invitation", acceptInvitation);

// POST /api/project/decline-invitation
router.post("/decline-invitation", declineInvitation);

// GET /api/project/contributors/:projectId
router.get("/contributors/:projectId", getContributorsByProject);

router.post("/daily-report/create", createDailyReport);
router.get("/daily-report/:reportId", getReportById); 
router.get("/get/daily-report/by/:projectId", getReportsByProject); 
router.get("/get/past-report/by/:projectId", getPastReportsByProject); 
router.delete("/delete/daily-report/:reportId", deleteDailyReport);
router.put("/daily-report/update/:reportId", updateDailyReport); // accepts form-data with reportId
router.get("/get/all/delay-suggestions", delaySuggestion);
router.put('/daily-log/status/:reportId', markProjectDailyLogStatus);

// weeklyGoals
router.post("/weekly-goal/create", createWeeklyGoal);
router.get("/weekly-goal/:id", getWeeklyGoalById);
router.put("/weekly-goal/update/:id", updateWeeklyGoal);
router.delete("/weekly-goal/:id", deleteWeeklyGoal);
router.get("/weekly/goal/by/:projectId", getWeeklyGoalsByProjectId);
router.get("/daily-report/by/weekly/goal/:weeklyGoalId", getDailyReportsByWeeklyGoal);

export default router;
