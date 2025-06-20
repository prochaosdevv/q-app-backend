import AWS from "aws-sdk";
import fs from "fs";
import formidable from "formidable";
import dotenv from "dotenv";
import Project from "../models/project.js";
dotenv.config();

// S3 Setup
const s3Client = new AWS.S3({
  secretAccessKey: process.env.ACCESS_KEY,
  accessKeyId: process.env.ACCESS_ID,
  region: process.env.region,
});

// ========= CREATE Project =========
export const createProject = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.maxFileSize = 10 * 1024 * 1024;
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Form parsing error: " + err.message,
      });
    }

    try {
      const { name, description, contributors } = fields;
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Project name is required.",
        });
      }

      let imageUrl = "";
      if (files.image) {
        const file = files.image;
        const fileContent = fs.readFileSync(file.filepath);

        const uploadResult = await s3Client
          .upload({
            Bucket: process.env.IMAGE_BUCKET,
            Key: `projects/${Date.now()}-${file.originalFilename}`,
            Body: fileContent,
            ContentType: file.mimetype,
            // ACL: "public-read",
          })
          .promise();

        imageUrl = uploadResult.Location;
      }

      const parsedContributors = contributors ? JSON.parse(contributors) : [];

      const project = await Project.create({
        name,
        description,
        image: imageUrl,
        contributors: parsedContributors,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        success: true,
        message: "Project created successfully.",
        project,
      });
    } catch (error) {
      console.error("Project creation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  });
};

// ========= GET All Projects =========
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find() .populate("createdBy", "fullname email bio image provider").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Projects fetched successfully.",
      projects,
    });
  } catch (error) {
    console.error("Fetching projects error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ========= UPDATE Project Image =========
export const editProjectImage = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.maxFileSize = 10 * 1024 * 1024;
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Form parsing error: " + err.message,
      });
    }

    try {
      const { projectId } = fields;
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required.",
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }

      if (files.image) {
        const file = files.image;
        const fileContent = fs.readFileSync(file.filepath);

        const uploadResult = await s3Client
          .upload({
            Bucket: process.env.IMAGE_BUCKET,
            Key: `projects/${Date.now()}-${file.originalFilename}`,
            Body: fileContent,
            ContentType: file.mimetype,
          })
          .promise();

        project.image = uploadResult.Location;
        await project.save();
      }

      res.status(200).json({
        success: true,
        message: "Project image updated successfully.",
        project,
      });
    } catch (error) {
      console.error("Update image error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  });
};
