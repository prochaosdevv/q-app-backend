import DailyReport from "../models/dailyReport.js";
import WeeklyGoal from "../models/weeklyGoal.js";


export const getWeeklyGoalsByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    const weeklyGoals = await WeeklyGoal.find({ project: projectId })
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      weeklyGoals,
    });
  } catch (error) {
    console.error("Error fetching weekly goals:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


export const getDailyReportsByWeeklyGoal = async (req, res) => {
  try {
    const { weeklyGoalId } = req.params;

    // Find the weekly goal
    const weeklyGoal = await WeeklyGoal.findById(weeklyGoalId);
    if (!weeklyGoal) {
      return res.status(404).json({
        success: false,
        message: "Weekly goal not found.",
      });
    }

    // Get daily reports for the same project where createdAt is between start and end dates
    const reports = await DailyReport.find({
      project: weeklyGoal.project,
      createdAt: {
        $gte: weeklyGoal.startDate,
        $lte: weeklyGoal.endDate,
      },
    }).sort({ createdAt: 1 }); // oldest first

    res.status(200).json({
      success: true,
      message: "Daily reports fetched successfully.",
      weeklyGoal,
      reports,
    });
  } catch (error) {
    console.error("Fetching daily reports error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

