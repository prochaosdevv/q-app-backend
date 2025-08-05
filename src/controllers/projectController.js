import ExcelJS from 'exceljs';
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
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';

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

          // if (!user) {
            referal = true;

            // Send invitation email
   await sendInvitationEmail(contributor.email, project.name, project._id);

          // }

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
        contributor:parsedContributors
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

        // if (!user) {
          referal = true;
          await sendInvitationEmail(contributor.email, project.name, project._id);
        // }

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


// export const signupContributor = async (req, res) => {
//   try {
//     const { fullname, email, password, contributorId } = req.body;

//     if (!fullname || !email || !password || !contributorId) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required...!!",
//       });
//     }

//     let user = await User.findOne({ email });

//     if (!user) {
//       // Create new user
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);

//       user = await User.create({
//         fullname,
//         email,
//         password: hashedPassword,
//       });
//     }

//     // Now update the contributor entry
//     const contributor = await Contributor.findById(contributorId);
//     if (!contributor) {
//       return res.status(404).json({
//         success: false,
//         message: "Contributor invitation not found...!!",
//       });
//     }

//     contributor.userId = user._id;
//     contributor.status = 1; // signed up
//     await contributor.save();

//     // Issue token
//     const token = jwt.sign(
//       { userId: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "24h" },
//     );

//     res.status(201).json({
//       success: true,
//       message: "Contributor signed up successfully...!!",
//       token,
//       user: {
//         id: user._id,
//         fullname: user.fullname,
//         email: user.email,
//       },
//       contributor,
//     });
//   } catch (error) {
//     console.error("Contributor signup error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error...!!",
//     });
//   }
// };

// getPendingInvitations
export const getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.userId;
// console.log(userId);

    const invitations = await Contributor.find({
      userId,
      invitationStatus: 'pending',
      referal: true,
    });

    res.status(200).json({
      success: true,
      invitations,
    });
  } catch (err) {
    console.error('Error fetching pending invitations:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// Accept invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { projectId } = req.body;

    const contributor = await Contributor.findOne({
      userId: req.user.userId,
      project:projectId,
      invitationStatus: "pending",
      referal: true,
      status: 1,
    });

    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "No pending referral invitation found for this project.",
      });
    }

    contributor.invitationStatus = "accepted";
    await contributor.save();

    res.status(200).json({
      success: true,
      message: "Referral invitation accepted.",
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
    const { projectId } = req.body;

    const contributor = await Contributor.findOne({
      userId: req.user.userId,
      project:projectId,
      invitationStatus: "pending",
      referal: true,
      status: 1,
    });

    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "No pending referral invitation found for this project.",
      });
    }

    contributor.invitationStatus = "declined";
    await contributor.save();

    res.status(200).json({
      success: true,
      message: "Referral invitation declined.",
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


export const exportProjectReport = async (req, res) => {
  try {
        const { projectId } = req.params;
const { startDate: inputStartDate, endDate: inputEndDate, reportType, dateType } = req.body;

let startDate = null;
let endDate = null;

const today = new Date();
today.setHours(0, 0, 0, 0); // reset to start of today

if (dateType === "today") {
  startDate = new Date(today);
  endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
}

else if (dateType === "yesterday") {
  startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 1);
  endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);
}

else if (dateType === "currentWeek") {
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  startDate = new Date(today);
  startDate.setDate(today.getDate() + diffToMonday);
  startDate.setHours(0, 0, 0, 0);

  endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
}

else if (dateType === "lastWeek") {
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToLastMonday = dayOfWeek === 0 ? -13 : -6 - (dayOfWeek - 1);

  startDate = new Date(today);
  startDate.setDate(today.getDate() + diffToLastMonday);
  startDate.setHours(0, 0, 0, 0);

  endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
}

else if (dateType === "custom") {
  startDate = inputStartDate ? new Date(inputStartDate) : null;
  endDate = inputEndDate ? new Date(inputEndDate) : null;

  if (startDate) startDate.setHours(0, 0, 0, 0);
  if (endDate) endDate.setHours(23, 59, 59, 999);
  // console.log(startDate,endDate,inputStartDate,inputEndDate);
}

else if (dateType === "all") {
  startDate = null;
  endDate = null;
}

// MongoDB Query Build
const query = {
  project: projectId
};


if (startDate && endDate) {
  query.createdAt = { $gte: startDate, $lte: endDate };
}

const project = await Project.findById(projectId).populate('createdBy');
if (!project) {
  return res.status(404).json({ success: false, message: "Project not found" });
}

const reports = await DailyReport.find(query)
  .populate('labour')
  .populate('material')
  .populate('plant')
  .populate('weather');
if (!reports || reports.length === 0) {
  return res.status(404).json({ success: false, message: "No reports found for the selected date range." });
}

    if (reportType === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Reports');

      const applyBorder = (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } },
          };
           cell.alignment = { horizontal: 'left' }; 
        });
      };

      for (const report of reports) {
        // ---- Details Section ----
        const detailsTitle = worksheet.addRow(['Details']);
        detailsTitle.font = { bold: true };

        const detailRows = [
          ['Project:', project.name],
          ['Date:', new Date(report.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })],
          // ['Weather:', report.weather?.condition || ''],
          ['User:', project.createdBy?.fullname || '']
        ];
        detailRows.forEach((data) => {
          const row = worksheet.addRow(data);
          row.getCell(1).alignment = { horizontal: 'left' };
          row.getCell(2).alignment = { horizontal: 'left' };
        });
        worksheet.addRow([]);

        // ---- Progress Section ----
        const progressTitle = worksheet.addRow(['Progress']);
        progressTitle.font = { bold: true };
        worksheet.addRow([]);

        const progressRows = [
          ['Report', report.progressReport || ''],
          ['Delays', report.delays || '']
        ];
        progressRows.forEach((data) => {
          const row = worksheet.addRow(data);
          row.getCell(1).alignment = { vertical: 'top' };
          row.getCell(2).alignment = { vertical: 'top', wrapText: true };
        });
        worksheet.addRow([]);

        // ---- Labour Section ----
        const labourTitle = worksheet.addRow(['Labour']);
        labourTitle.font = { bold: true };

        const labourHeader = worksheet.addRow(['Name', 'Role']);
        labourHeader.font = { bold: true };
        applyBorder(labourHeader);

        report.labour.forEach((l) => {
          const row = worksheet.addRow([l.name, l.role]);
          applyBorder(row);
        });
        worksheet.addRow([]);

        // ---- Material Section ----
        const materialTitle = worksheet.addRow(['Material']);
        materialTitle.font = { bold: true };

        const materialHeader = worksheet.addRow(['Type', 'Qty', 'Unit']);
        materialHeader.font = { bold: true };
        applyBorder(materialHeader);

        report.material.forEach((m) => {
          const row = worksheet.addRow([m.type, m.qty, m.unit]);
          applyBorder(row);
        });
        worksheet.addRow([]);

        // ---- Plant Section ----
        const plantTitle = worksheet.addRow(['Plant']);
        plantTitle.font = { bold: true };

        const plantHeader = worksheet.addRow(['Description', 'Qty']);
        plantHeader.font = { bold: true };
        applyBorder(plantHeader);

        report.plant.forEach((p) => {
          const row = worksheet.addRow([p.desc, p.qty]);
          applyBorder(row);
        });

        worksheet.addRow([]); // Separator Row
      }

      // Auto-fit column widths
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength + 5;
      });

      // Excel File Headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="Project-Report.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } 
    else if (reportType === 'pdf') {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Project-Report.pdf"`);

  doc.pipe(res);

  const colSpacing = 150; // adjust as needed

  for (const report of reports) {
    // ---- Details Section ----
    doc.fontSize(14).text('Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Project: ${project.name}`);
    doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString('en-GB')}`);
    doc.text(`User: ${project.createdBy?.fullname || ''}`);
    doc.moveDown();

    // ---- Progress Section ----
    doc.fontSize(14).text('Progress', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Report: ${report.progressReport || ''}`);
    doc.text(`Delays: ${report.delays || ''}`);
    doc.moveDown();

    const startX = doc.x;
    let currentY = doc.y;

    // ---- Labour Section ----
    if (report.labour.length > 0) {
      doc.fontSize(14).text('Labour', startX, currentY, { underline: true });
      currentY = doc.y + 5;

      doc.fontSize(10)
        .text('Name', startX, currentY)
        .text('Role', startX + colSpacing, currentY);

      currentY = doc.y + 5;

      report.labour.forEach((l) => {
        doc.text(l.name, startX, currentY)
          .text(l.role, startX + colSpacing, currentY);
        currentY += 15;
      });
      doc.moveDown();
    }

    // ---- Material Section ----
    if (report.material.length > 0) {
      doc.fontSize(14).text('Material', startX, currentY, { underline: true });
      currentY = doc.y + 5;

      doc.fontSize(10)
        .text('Type', startX, currentY)
        .text('Qty', startX + colSpacing, currentY)
        .text('Unit', startX + colSpacing * 2, currentY);

      currentY = doc.y + 5;

      report.material.forEach((m) => {
        doc.text(m.type, startX, currentY)
          .text(m.qty.toString(), startX + colSpacing, currentY)
          .text(m.unit, startX + colSpacing * 2, currentY);
        currentY += 15;
      });
      doc.moveDown();
    }

    // ---- Plant Section ----
    if (report.plant.length > 0) {
      doc.fontSize(14).text('Plant', startX, currentY, { underline: true });
      currentY = doc.y + 5;

      doc.fontSize(10)
        .text('Description', startX, currentY)
        .text('Qty', startX + colSpacing, currentY);

      currentY = doc.y + 5;

      report.plant.forEach((p) => {
        doc.text(p.desc, startX, currentY)
          .text(p.qty.toString(), startX + colSpacing, currentY);
        currentY += 15;
      });
      doc.moveDown();
    }

    doc.addPage(); // Add new page for next report
  }

  doc.end();
}
 else {
      return res.status(400).json({ success: false, message: "Invalid reportType." });
    }
  } catch (error) {
    console.error("Export report error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
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

