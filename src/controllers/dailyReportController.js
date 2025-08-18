import fs from "fs";
import formidable from "formidable";
import AWS from "aws-sdk";

import DailyReport from "../models/dailyReport.js";
import Project from "../models/project.js";
import Labour from "../models/labour.js";
import Material from "../models/material.js";
import Weather from "../models/weather.js";
import Plant from "../models/plant.js";

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

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }

      // Handle Labour
      let labourIds = [];
      if (labour) {
        let parsedLabour = JSON.parse(labour);
        for (const l of parsedLabour) {
          const labourDoc = await Labour.create(l);
          labourIds.push(labourDoc._id);
        }
      }

      // Handle Material
      let materialIds = [];
      if (material) {
        let parsedMaterial = JSON.parse(material);
        for (const m of parsedMaterial) {
          const materialDoc = await Material.create(m);
          materialIds.push(materialDoc._id);
        }
      }

      // Handle Plant
      let plantIds = [];
      if (plant) {
        let parsedPlant = JSON.parse(plant);
        for (const p of parsedPlant) {
          const plantDoc = await Plant.create(p);
          plantIds.push(plantDoc._id);
        }
      }

      // Handle Weather
      let weatherId = null;
      if (weather) {
        let parsedWeather = JSON.parse(weather);
        const weatherDoc = await Weather.create(parsedWeather);
        weatherId = weatherDoc._id;
      }

      // Handle Images
      let photoUrls = [];
      if (files.photos) {
        const photoFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
        for (const file of photoFiles) {
          const url = await uploadToS3(file);
          photoUrls.push(url);
        }
      }

      // Create Daily Report
      const report = await DailyReport.create({
        project: projectId,
        progressReport,
        delays,
        plant: plantIds,
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

      // Delete old linked data
      await Labour.deleteMany({ _id: { $in: report.labour } });
      await Material.deleteMany({ _id: { $in: report.material } });
      await Plant.deleteMany({ _id: { $in: report.plant } });
      if (report.weather) {
        await Weather.findByIdAndDelete(report.weather);
      }

      // Recreate Labour
      let labourIds = [];
      if (labour) {
        let parsedLabour = JSON.parse(labour);
        for (const l of parsedLabour) {
          const labourDoc = await Labour.create(l);
          labourIds.push(labourDoc._id);
        }
      }

      // Recreate Material
      let materialIds = [];
      if (material) {
        let parsedMaterial = JSON.parse(material);
        for (const m of parsedMaterial) {
          const materialDoc = await Material.create(m);
          materialIds.push(materialDoc._id);
        }
      }

      // Recreate Plant
      let plantIds = [];
      if (plant) {
        let parsedPlant = JSON.parse(plant);
        for (const p of parsedPlant) {
          const plantDoc = await Plant.create(p);
          plantIds.push(plantDoc._id);
        }
      }

      // Recreate Weather
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

      // Update Report Fields
      report.progressReport = progressReport;
      report.delays = delays;
      report.plant = plantIds;
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
    await Plant.deleteMany({ _id: { $in: report.plant } });
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

export const getReportsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const today = new Date();

    const day = today.getDay();
    
    const startDate = new Date(today - (day-1)*1000*60*60*24)
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate((startDate).getDate());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5);
    endOfWeek.setHours(23, 59, 59, 999);

console.log(startDate,startOfWeek,endOfWeek);

    const reports = await DailyReport.find({ project: projectId,createdAt: { $gte: startOfWeek, $lte: endOfWeek }, })
      .populate("project")
      .populate("labour")
      .populate("material")
      .populate("plant")
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
  const { projectId } = req.params;
  const { startDate, endDate } = req.query;
  try {
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required.",
      });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const reports = await DailyReport.find({
      project: projectId,
      createdAt: { $gte: start, $lte: end },
    })
      .populate("project")
      .populate("labour")
      .populate("material")
      .populate("plant")
      .populate("weather")
      .sort({ createdAt: -1 });
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


export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await DailyReport.findById(reportId)
      .populate("project")
      .populate("labour")
      .populate("material")
      .populate("plant")
      .populate("weather")
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


export const delaySuggestion = async (req, res) => {
  try {
    const uniqueDelays = await DailyReport.distinct("delays", {
      delays: { $ne: null, $exists: true, $ne: "" },
    });

    res.status(200).json({
      success: true,
      message: "Unique delays fetched successfully.",
      delays: uniqueDelays.sort((a, b) => a - b),
    });
  } catch (error) {
    console.error("Error fetching delay suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching delay suggestions.",
    });
  }
};
