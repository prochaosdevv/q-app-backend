import DailyReport from "../models/dailyReport.js";
import Project from "../models/project.js";


// Create daily report
export const createDailyReport = async (req, res) => {
  try {
    const { projectId, progressReport, weather, delays, labour, material, plant } = req.body;

    // Validate project existence
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const report = await DailyReport.create({
      project: projectId,
      progressReport,
      weather,
      delays,
      labour,
      material,
      plant,
    });

    res.status(201).json({
      success: true,
      message: "Daily report created successfully.",
      report,
    });
  } catch (error) {
    console.error("Create daily report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Get reports by project
export const getReportsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const reports = await DailyReport.find({ project: projectId })
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: "Reports fetched successfully.",
      reports,
    });
  } catch (error) {
    console.error("Get reports by project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
