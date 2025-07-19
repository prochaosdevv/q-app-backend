import DailyReport from "../models/dailyReport.js";
import WeeklyGoal from "../models/weeklyGoal.js";


// CREATE Weekly Goal
export const createWeeklyGoal = async (req, res) => {
  try {
    const { project, goals } = req.body;

    if (!project || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project ID and an array of goals are required.",
      });
    }

    // Validate each goal
    const invalidGoal = goals.find(
      (goal) =>
        !goal.title || !goal.description || !goal.startDate || !goal.endDate
    );

    if (invalidGoal) {
      return res.status(400).json({
        success: false,
        message:
          "Each goal must have title, description, startDate, and endDate fields.",
      });
    }

    // Attach project to each goal
    const goalsWithProject = goals.map((goal) => ({
      ...goal,
      project,
    }));

    const createdGoals = await WeeklyGoal.insertMany(goalsWithProject);

    res.status(201).json({
      success: true,
      message: "Weekly goals created successfully.",
      goals: createdGoals,
    });
  } catch (error) {
    console.error("Error creating weekly goals:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};


// READ Weekly Goal by ID
export const getWeeklyGoalById = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await WeeklyGoal.findById(id);
    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    res.status(200).json({ success: true, goal });
  } catch (error) {
    console.error("Error fetching goal by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// UPDATE Weekly Goal
export const updateWeeklyGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate } = req.body;

    const updatedGoal = await WeeklyGoal.findByIdAndUpdate(
      id,
      { title, description, startDate, endDate },
      { new: true }
    );

    if (!updatedGoal) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    res.status(200).json({
      success: true,
      message: "Weekly goal updated successfully.",
      goal: updatedGoal,
    });
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// DELETE Weekly Goal
export const deleteWeeklyGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedGoal = await WeeklyGoal.findByIdAndDelete(id);

    if (!deletedGoal) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    res.status(200).json({
      success: true,
      message: "Weekly goal deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};


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

