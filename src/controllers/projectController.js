const AWS = require("aws-sdk");
const fs = require("fs");
const formidable = require("formidable");
const Project = require("../models/project.model");
require("dotenv").config();

const s3Client = new AWS.S3({
  secretAccessKey: process.env.ACCESS_KEY,
  accessKeyId: process.env.ACCESS_ID,
  region: process.env.region,
});

// Create Project (formidable + S3 image upload)
const createProject = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.maxFileSize = 10 * 1024 * 1024; // 10MB
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
            Bucket: process.env.BUCKET_NAME,
            Key: `projects/${Date.now()}-${file.originalFilename}`,
            Body: fileContent,
            ContentType: file.mimetype,
            ACL: "public-read",
          })
          .promise();

        imageUrl = uploadResult.Location;
      }

      const parsedContributors = contributors
        ? JSON.parse(contributors)
        : [];

      const project = await Project.create({
        name,
        description,
        image: imageUrl,
        contributors: parsedContributors,
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

module.exports = {
  createProject,
};
