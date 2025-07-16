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
  markProjectDailyLogCompleted
} from "../controllers/projectController.js";
import verifyToken from "../middleware/auth.js";
import { createDailyReport, deleteDailyReport, getPastReportsByProject, getReportById, getReportsByProject, updateDailyReport } from "../controllers/dailyReportController.js";
import { getDailyReportsByWeeklyGoal, getWeeklyGoalsByProjectId } from "../controllers/weeklyGoalController.js";

const router = express.Router();

// POST /api/project/create
router.post("/create",verifyToken, createProject);

// POST /api/add-contributor
router.post("/add-contributors", addContributorsToProject);

// GET /api/project
router.get("/",verifyToken, getProjects);

// GET /api/project/by/id
router.get("/:projectId", getProjectById);
router.put("/mark-sent/:projectId", markProjectReportAsSent);
router.put("/mark-completed/:projectId", markProjectDailyLogCompleted);


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
router.put("/daily-report/update/:reportId", updateDailyReport); // accepts form-data with reportId
router.delete("/daily-report/:reportId", deleteDailyReport); 
router.get("/weekly/goal/by/:projectId", getWeeklyGoalsByProjectId)
router.get("/daily-report/by/weekly/goal/:weeklyGoalId", getDailyReportsByWeeklyGoal)

export default router;
