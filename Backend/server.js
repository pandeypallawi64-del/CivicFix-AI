
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const OpenAI = require("openai");
const cloudinary = require("cloudinary").v2;

const Report = require("./models/Report");

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image files are allowed."));
    }
    callback(null, true);
  },
});

// =====================================================
// CONFIGURATION
// =====================================================

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =====================================================
// CLOUDINARY IMAGE UPLOAD
// =====================================================

function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "civicfix-reports", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

// =====================================================
// TEXT-BASED AI ANALYSIS
// =====================================================

async function analyzeReport(description) {
  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    input: `Analyze this civic issue: "${description}"

Return ONLY valid JSON with these fields:
{
  "category": "road, streetlight, garbage, water, traffic, or other",
  "severity": "low, medium, high, or critical",
  "urgency": "low, medium, or high",
  "department": "responsible government department",
  "reason": "brief explanation",
  "impactScore": 0
}

impactScore must be an integer from 0 to 100.`,
  });

  const result = JSON.parse(response.output_text);

  const categories = [
    "road",
    "streetlight",
    "garbage",
    "water",
    "traffic",
    "other",
  ];

  const severities = ["low", "medium", "high", "critical"];
  const urgencies = ["low", "medium", "high"];

  if (!categories.includes(result.category)) result.category = "other";
  if (!severities.includes(result.severity)) result.severity = "medium";
  if (!urgencies.includes(result.urgency)) result.urgency = "medium";

  result.impactScore = Math.max(
    0,
    Math.min(100, Number(result.impactScore) || 0)
  );

  return result;
}

// =====================================================
// TEXT FALLBACK — WORKS WITHOUT OPENAI CREDITS
// =====================================================

function fallbackAnalysis(description = "") {
  const text = description.toLowerCase();

  let category = "other";
  let department = "Municipal Administration";
  let severity = "medium";
  let urgency = "medium";
  let reason = "The reported issue may require inspection by local authorities.";
  let impactScore = 45;

  if (
    text.includes("garbage") ||
    text.includes("trash") ||
    text.includes("waste") ||
    text.includes("rubbish") ||
    text.includes("dirty") ||
    text.includes("dump")
  ) {
    category = "garbage";
    department = "Municipal Sanitation";
    reason = "Accumulated waste can create hygiene and public-health risks.";
    impactScore = 65;
  } else if (
    text.includes("road") ||
    text.includes("pothole") ||
    text.includes("pavement") ||
    text.includes("street damage") ||
    text.includes("broken road")
  ) {
    category = "road";
    department = "Public Works Department";
    reason = "Damaged roads may increase accident risks and disrupt travel.";
    impactScore = 70;
  } else if (
    text.includes("streetlight") ||
    text.includes("street light") ||
    text.includes("lamp post") ||
    text.includes("dark street") ||
    text.includes("light not working")
  ) {
    category = "streetlight";
    department = "Municipal Electrical Department";
    reason = "Poor street lighting can reduce visibility and affect public safety.";
    impactScore = 55;
  } else if (
    text.includes("water") ||
    text.includes("leak") ||
    text.includes("pipe burst") ||
    text.includes("drain") ||
    text.includes("sewage") ||
    text.includes("flood")
  ) {
    category = "water";
    department = "Water and Sanitation Department";
    reason = "Water supply or drainage problems can affect residents and sanitation.";
    impactScore = 70;
  } else if (
    text.includes("traffic") ||
    text.includes("signal") ||
    text.includes("congestion") ||
    text.includes("accident") ||
    text.includes("roadblock")
  ) {
    category = "traffic";
    department = "Traffic Police";
    reason = "Traffic problems can disrupt movement and may create safety risks.";
    impactScore = 60;
  }

  if (
    text.includes("urgent") ||
    text.includes("dangerous") ||
    text.includes("accident") ||
    text.includes("emergency") ||
    text.includes("severe")
  ) {
    severity = "high";
    urgency = "high";
    impactScore = Math.max(impactScore, 80);
  }

  if (
    text.includes("life-threatening") ||
    text.includes("collapsed") ||
    text.includes("major flood")
  ) {
    severity = "critical";
    urgency = "high";
    impactScore = 95;
  }

  return {
    category,
    severity,
    urgency,
    department,
    reason,
    impactScore,
  };
}

// =====================================================
// IMAGE ANALYSIS
// =====================================================

async function analyzeCivicImage(description, imageDataUrl) {
  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Analyze this civic issue photo together with the citizen's description.

Description: "${description || "No description provided"}"

Return ONLY valid JSON:
{
  "imageCategory": "road, streetlight, garbage, water, traffic, or other",
  "imageDescription": "What is visibly shown in the image",
  "matchesDescription": true,
  "confidence": 0,
  "reason": "Brief explanation"
}

Describe only what is reasonably visible.
Confidence must be from 0 to 100.
If the image is unclear, use category "other".`,
          },
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "low",
          },
        ],
      },
    ],
  });

  const result = JSON.parse(response.output_text);

  const allowedCategories = [
    "road",
    "streetlight",
    "garbage",
    "water",
    "traffic",
    "other",
  ];

  if (!allowedCategories.includes(result.imageCategory)) {
    result.imageCategory = "other";
  }

  result.confidence = Math.max(
    0,
    Math.min(100, Number(result.confidence) || 0)
  );

  result.matchesDescription = result.matchesDescription === true;

  return result;
}

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({ success: true, message: "CivicFix-AI backend is running." });
});

// =====================================================
// GET ALL REPORTS
// =====================================================

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    console.error("Fetch reports error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not fetch reports.",
    });
  }
});

// =====================================================
// CREATE A REPORT
// =====================================================

app.post("/api/reports", upload.single("image"), async (req, res) => {
  let imageUrl = "";
  let imagePublicId = "";

  try {
    const {
      description,
      category,
      severity,
      location,
      latitude,
      longitude,
    } = req.body;

    if (!description || !category || !severity || !location) {
      return res.status(400).json({
        success: false,
        message: "Description, category, severity, and location are required.",
      });
    }

    // Upload the image first, if supplied.
    if (req.file) {
      try {
        const uploaded = await uploadToCloudinary(req.file.buffer);
        imageUrl = uploaded.secure_url;
        imagePublicId = uploaded.public_id;
      } catch (error) {
        console.error("Cloudinary upload failed:", error.message);
        return res.status(500).json({
          success: false,
          message: "Image upload failed. Please try again.",
        });
      }
    }

    // Text analysis falls back when the API is unavailable.
    let analysis;

    try {
      analysis = await analyzeReport(description);
    } catch (error) {
      console.error(
        "OpenAI text analysis unavailable. Using fallback analysis:",
        error.message
      );
      analysis = fallbackAnalysis(description);
    }

    // Default image-analysis values.
    let imageAnalysis = null;
    let imageAnalysisStatus = req.file ? "unavailable" : "not_requested";

    if (req.file) {
      try {
        const base64 = req.file.buffer.toString("base64");
        const imageDataUrl = `data:${req.file.mimetype};base64,${base64}`;

        imageAnalysis = await analyzeCivicImage(description, imageDataUrl);
        imageAnalysisStatus = "completed";
      } catch (error) {
        console.error("Image analysis unavailable:", error.message);
        imageAnalysisStatus = "unavailable";
      }
    }

    const report = await Report.create({
      description,
      category,
      severity,
      location,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,

      imageUrl,
      imagePublicId,

      aiCategory: analysis.category,
      aiSeverity: analysis.severity,
      urgency: analysis.urgency,
      department: analysis.department,
      reason: analysis.reason,
      impactScore: analysis.impactScore,

      imageAnalysisStatus,
      imageCategory: imageAnalysis?.imageCategory || "",
      imageDescription: imageAnalysis?.imageDescription || "",
      imageMatchesDescription: imageAnalysis?.matchesDescription ?? null,
      imageConfidence: imageAnalysis?.confidence ?? 0,
      imageAnalysisReason: imageAnalysis?.reason || "",

      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully.",
      report,
    });
  } catch (error) {
    console.error("Create report error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not submit the report.",
    });
  }
});

// =====================================================
// UPDATE REPORT STATUS
// =====================================================

app.post("/api/reports/update-status", async (req, res) => {
  try {
    const { id, status } = req.body;
    const allowedStatuses = ["Pending", "In Progress", "Resolved"];

    if (!id || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "A valid report ID and status are required.",
      });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    res.json(report);
  } catch (error) {
    console.error("Update status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update report status.",
    });
  }
});

// =====================================================
// DELETE A REPORT
// =====================================================

app.delete("/api/reports/:id", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    if (report.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(report.imagePublicId);
      } catch (error) {
        console.error("Cloudinary deletion error:", error.message);
      }
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    console.error("Delete report error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not delete report.",
    });
  }
});

// =====================================================
// GENERATE A COMPLAINT
// =====================================================

app.post("/api/reports/generate-complaint", async (req, res) => {
  try {
    const {
      description,
      category,
      severity,
      urgency,
      department,
      location,
      reason,
    } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Issue description is required.",
      });
    }

    const subject = `Civic Issue Report: ${category || "General Issue"}`;

    const complaint = `To,
The Concerned Officer,
${department || "Relevant Government Department"}

Subject: ${subject}

Respected Sir/Madam,

I wish to report a civic issue at the following location: ${
      location || "Location not specified"
    }.

Issue description: ${description}

Category: ${category || "Not specified"}
Severity: ${severity || "Not specified"}
Urgency: ${urgency || "Not specified"}

Reason for reporting: ${
      reason || "The issue requires inspection and appropriate action."
    }

I kindly request that the concerned department inspect this issue and take the necessary action at the earliest.

Thank you.

Yours faithfully,
A concerned citizen`;

    res.json({
      success: true,
      subject,
      complaint,
    });
  } catch (error) {
    console.error("Generate complaint error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not generate complaint.",
    });
  }
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Image size must be 5 MB or less."
          : error.message,
    });
  }

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error.",
  });
});

// =====================================================
// DATABASE + SERVER
// =====================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`CivicFix-AI backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });