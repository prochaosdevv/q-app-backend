
import fs from "fs";
import formidable from "formidable";
import AWS from "aws-sdk";

import DailyReport from "../models/dailyReport.js";
import Project from "../models/project.js";
import Labour from "../models/labour.js";
import Material from "../models/material.js";
import Weather from "../models/weather.js";

const s3Client = new AWS.S3({
  secretAccessKey: process.env.ACCESS_KEY,
  accessKeyId: process.env.ACCESS_ID,
  region: process.env.region,
});

// Helper to upload a file to S3
const uploadToS3 = async (file) => {
  const fileContent = fs.readFileSync(file.filepath);

  const upload = await s3Client.upload({
    Bucket: process.env.IMAGE_BUCKET,
    Key: `daily-reports/${Date.now()}-${file.originalFilename}`,
    Body: fileContent,
    ContentType: file.mimetype,
  }).promise();

  return upload.Location;
};

export const createDailyReport = async (req, res) => {
  const form = new formidable.IncomingForm({ multiples: true });
  form.maxFileSize = 20 * 1024 * 1024;
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Form parsing error: " + err.message,
      });
    }

    try {
      const {
        projectId,
        progressReport,
        delays,
        plant,
        labour,
        material,
        weather,
      } = fields;

      // Validate project
      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }

      // Handle labour
      let labourIds = [];
      if (labour) {
        let parsedLabour;
        try {
          parsedLabour = JSON.parse(labour);
        } catch (jsonErr) {
          return res.status(400).json({
            success: false,
            message: "Invalid JSON for labour.",
          });
        }

        for (const l of parsedLabour) {
          const labourDoc = await Labour.create(l);
          labourIds.push(labourDoc._id);
        }
      }

      // Handle material
      let materialIds = [];
      if (material) {
        let parsedMaterial;
        try {
          parsedMaterial = JSON.parse(material);
        } catch (jsonErr) {
          return res.status(400).json({
            success: false,
            message: "Invalid JSON for material.",
          });
        }

        for (const m of parsedMaterial) {
          const materialDoc = await Material.create(m);
          materialIds.push(materialDoc._id);
        }
      }

      // Handle weather
      let weatherId = null;
      if (weather) {
        let parsedWeather;
        try {
          parsedWeather = JSON.parse(weather);
        } catch (jsonErr) {
          return res.status(400).json({
            success: false,
            message: "Invalid JSON for weather.",
          });
        }

        const weatherDoc = await Weather.create(parsedWeather);
        weatherId = weatherDoc._id;
      }

      // Handle images
      let photoUrls = [];
      if (files.photos) {
        const photoFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
        for (const file of photoFiles) {
          const url = await uploadToS3(file);
          photoUrls.push(url);
        }
      }

      // Create daily report
      const report = await DailyReport.create({
        project: projectId,
        progressReport,
        delays,
        plant,
        labour: labourIds,
        material: materialIds,
        weather: weatherId,
        photos: photoUrls,
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
  });
};

// update daily report
export const updateDailyReport = async (req, res) => {
  const { reportId } = req.params;
  const form = new formidable.IncomingForm({ multiples: true });
  form.maxFileSize = 20 * 1024 * 1024;
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Form parsing error: " + err.message,
      });
    }

    try {
      const { progressReport, delays, plant, labour, material, weather } = fields;

      const report = await DailyReport.findById(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Daily report not found.",
        });
      }

      // Delete old labour, material, weather
      await Labour.deleteMany({ _id: { $in: report.labour } });
      await Material.deleteMany({ _id: { $in: report.material } });
      if (report.weather) {
        await Weather.findByIdAndDelete(report.weather);
      }

      // Recreate labour
      let labourIds = [];
      if (labour) {
        let parsedLabour = JSON.parse(labour);
        for (const l of parsedLabour) {
          const labourDoc = await Labour.create(l);
          labourIds.push(labourDoc._id);
        }
      }

      // Recreate material
      let materialIds = [];
      if (material) {
        let parsedMaterial = JSON.parse(material);
        for (const m of parsedMaterial) {
          const materialDoc = await Material.create(m);
          materialIds.push(materialDoc._id);
        }
      }

      // Recreate weather
      let weatherId = null;
      if (weather) {
        let parsedWeather = JSON.parse(weather);
        const weatherDoc = await Weather.create(parsedWeather);
        weatherId = weatherDoc._id;
      }

      // Upload new photos if provided
      let photoUrls = report.photos; // keep existing if no new
      if (files.photos) {
        photoUrls = [];
        const photoFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
        for (const file of photoFiles) {
          const url = await uploadToS3(file);
          photoUrls.push(url);
        }
      }

      // Update report
      report.progressReport = progressReport;
      report.delays = delays;
      report.plant = plant;
      report.labour = labourIds;
      report.material = materialIds;
      report.weather = weatherId;
      report.photos = photoUrls;

      await report.save();

      res.status(200).json({
        success: true,
        message: "Daily report updated successfully.",
        report,
      });

    } catch (error) {
      console.error("Update daily report error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  });
};

//delete report
export const deleteDailyReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await DailyReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Daily report not found.",
      });
    }

    // Delete linked data
    await Labour.deleteMany({ _id: { $in: report.labour } });
    await Material.deleteMany({ _id: { $in: report.material } });
    if (report.weather) {
      await Weather.findByIdAndDelete(report.weather);
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Daily report deleted successfully.",
    });

  } catch (error) {
    console.error("Delete daily report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Get reports by projectId
export const getReportsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const reports = await DailyReport.find({ project: projectId })
      .populate("project")
      .populate("labour")
      .populate("material")
      .populate("weather")
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

export const getPastReportsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reports = await DailyReport.find({
      project: projectId,
      createdAt: { $lte: today },
    })
      .populate("project")
      .populate("labour")
      .populate("material")
      .populate("weather")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: "Past reports fetched successfully.",
      reports,
    });
  } catch (error) {
    console.error("Get past reports by project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


// Get reports by id
export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await DailyReport.findById(reportId)
      .populate("project")
      .populate("labour")
      .populate("material")
      .populate("weather");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Report fetched successfully.",
      report,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

