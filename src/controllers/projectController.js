import AWS from "aws-sdk";
import fs from "fs";
import formidable from "formidable";
import dotenv from "dotenv";
import Project from "../models/project.js";
import Contributor from "../models/contributor.js";
import User from "../models/user.model.js";
import { sendEmail, sendInvitationEmail } from "./emailController.js";
import WeeklyGoal from "../models/weeklyGoal.js";
import DailyReport from "../models/dailyReport.js";

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
      const { name, description } = fields;

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
          })
          .promise();

        imageUrl = uploadResult.Location;
      }

      // Create project
      const project = await Project.create({
        name,
        description,
        image: imageUrl,
        createdBy: req.user.userId,
      });

      // Handle contributors
      let parsedContributors = [];
      if (fields.contributors) {
        try {
          parsedContributors = JSON.parse(fields.contributors);
        } catch (jsonErr) {
          return res.status(400).json({
            success: false,
            message: "Invalid JSON format for contributors.",
          });
        }
      }

      await Promise.all(
        parsedContributors.map(async (contributor) => {
          let referal = false;

          // Check if user exists
          const user = await User.findOne({ email: contributor.email });

          if (!user) {
            referal = true;

            // Send invitation email
   await sendInvitationEmail(contributor.email, project.name, project._id);

          }

          await Contributor.create({
            email: contributor.email,
            permission: contributor.permission || "can view",
            userId: user ? user._id : null,
            referal,
            project: project._id,
            status: user ? 1 : 0,
          });
        }),
      );

      //    // ✨ CREATE 4 random weekly goals
      // const now = new Date();
      // let startDate = new Date(now);

      // for (let i = 1; i <= 4; i++) {
      //   let endDate = new Date(startDate);
      //   endDate.setDate(endDate.getDate() + 7); // next week
      //   await WeeklyGoal.create({
      //     project: project._id,
      //     title: `Weekly Goal ${i}`,
      //     description: `Description for weekly goal ${i}`,
      //     startDate,
      //     endDate,
      //   });

      //   // next goal starts where this one ended
      //   startDate = new Date(endDate);
      // }

      res.status(201).json({
        success: true,
        message: "Project created, invitations sent if needed.",
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

export const addContributorsToProject = async (req, res) => {
  try {
    const { projectId, contributors } = req.body;

    if (!projectId || !Array.isArray(contributors) || contributors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project ID and contributors array are required.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // Step 1: Check for already added contributors
    const contributorEmails = contributors.map((c) => c.email);
    const existingContributors = await Contributor.find({
      email: { $in: contributorEmails },
      project: projectId,
    });

    if (existingContributors.length > 0) {
      const alreadyAddedEmails = existingContributors.map((c) => c.email);
      return res.status(400).json({
        success: false,
        message: "Some contributors are already added to this project.",
        alreadyAddedEmails,
      });
    }

    // Step 2: Add only new contributors
    await Promise.all(
      contributors.map(async (contributor) => {
        let referal = false;
        const user = await User.findOne({ email: contributor.email });

        if (!user) {
          referal = true;
          await sendInvitationEmail(contributor.email, project.name, project._id);
        }

        await Contributor.create({
          email: contributor.email,
          permission: contributor.permission || "can view",
          userId: user ? user._id : null,
          referal,
          project: projectId,
          status: user ? 1 : 0,
        });
      })
    );

    res.status(200).json({
      success: true,
      message: "Contributors added successfully. Invitations sent if needed.",
    });
  } catch (error) {
    console.error("Add contributors error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const editMultipleContributorPermissions = async (req, res) => {
  try {
    const { projectId, contributors } = req.body;

    if (!projectId || !Array.isArray(contributors) || contributors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project ID and contributors array are required.",
      });
    }

    const updated = [];
    const newlyAdded = [];

    await Promise.all(
      contributors.map(async (contributor) => {
        const { email, permission } = contributor;

        if (!email || !permission) return;

        const existing = await Contributor.findOne({ email, project: projectId });

        if (!existing) {
          newlyAdded.push(email);
          return;
        }

        existing.permission = permission;
        await existing.save();
        updated.push(email);
      })
    );

    res.status(200).json({
      success: true,
      message: "Permissions updated.",
      updated,
      newlyAdded,
    });
  } catch (error) {
    console.error("Edit multiple contributor permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};




export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("createdBy", "fullname email bio image provider")
      .sort({ createdAt: -1 });

    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const contributors = await Contributor.find({
          project: project._id,
        }).populate("userId", "fullname email image");

        const weeklyGoals = await WeeklyGoal.find({
          project: project._id,
        }).sort({ startDate: 1 }); // optional: order by startDate

        return {
          ...project.toObject(),
          contributors,
          weeklyGoals,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Projects fetched successfully.",
      projects: projectsWithDetails,
    });
  } catch (error) {
    console.error("Fetching projects error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    const project = await Project.findById(projectId)
      .populate("createdBy", "fullname email bio image provider");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const contributors = await Contributor.find({ project: projectId })
      .populate("userId", "fullname email image");

    res.status(200).json({
      success: true,
      message: "Project fetched successfully.",
      project: {
        ...project.toObject(),
        contributors,
      },
    });
  } catch (error) {
    console.error("Fetching project by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


export const signupContributor = async (req, res) => {
  try {
    const { fullname, email, password, contributorId } = req.body;

    if (!fullname || !email || !password || !contributorId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required...!!",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = await User.create({
        fullname,
        email,
        password: hashedPassword,
      });
    }

    // Now update the contributor entry
    const contributor = await Contributor.findById(contributorId);
    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "Contributor invitation not found...!!",
      });
    }

    contributor.userId = user._id;
    contributor.status = 1; // signed up
    await contributor.save();

    // Issue token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(201).json({
      success: true,
      message: "Contributor signed up successfully...!!",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
      },
      contributor,
    });
  } catch (error) {
    console.error("Contributor signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error...!!",
    });
  }
};

// Accept invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { contributorId } = req.body;

    const contributor = await Contributor.findById(contributorId);
    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found.",
      });
    }

    contributor.invitationStatus = "accepted";
    await contributor.save();

    res.status(200).json({
      success: true,
      message: "Invitation accepted.",
      contributor,
    });
  } catch (err) {
    console.error("Accept invitation error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Decline invitation
export const declineInvitation = async (req, res) => {
  try {
    const { contributorId } = req.body;

    const contributor = await Contributor.findById(contributorId);
    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found.",
      });
    }

    contributor.invitationStatus = "declined";
    await contributor.save();

    res.status(200).json({
      success: true,
      message: "Invitation declined.",
      contributor,
    });
  } catch (err) {
    console.error("Decline invitation error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getContributorsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    const contributors = await Contributor.find({
      project: projectId,
    }).populate("userId", "fullname email image");

    res.status(200).json({
      success: true,
      message: "Contributors fetched successfully.",
      contributors,
    });
  } catch (error) {
    console.error("Get contributors by project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


export const markProjectReportAsSent = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByIdAndUpdate(
      projectId,
      { reportSent: true },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project marked as report sent.",
      project,
    });

  } catch (error) {
    console.error("Mark project report sent error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


export const markProjectDailyLogStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (typeof status === 'undefined') {
      return res.status(400).json({
        success: false,
        message: "Status is required in the request body.",
      });
    }

    const report = await DailyReport.findByIdAndUpdate(
      reportId,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Daily report not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Daily report status updated successfully.",
      report,
    });

  } catch (error) {
    console.error("Error updating daily report status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


// archiveProject 
export const archiveProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findOneAndUpdate(
      { _id: projectId, createdBy: userId },
      { status: 2 },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you are not the owner.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project archived successfully.",
      project,
    });
  } catch (error) {
    console.error("Archive project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
// deleteProject 
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findOne({ _id: projectId, createdBy: userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you're not authorized.",
      });
    }

    await Contributor.deleteMany({ project: projectId });
    await WeeklyGoal.deleteMany({ project: projectId });
    await Project.findByIdAndDelete(projectId);

    res.status(200).json({
      success: true,
      message: "Project and related data deleted.",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

