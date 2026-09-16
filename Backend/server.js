const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Report = require("./models/Report");
const OpenAI = require("openai"); 
require("dotenv").config();

const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// OPENAI
// ===============================

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===============================
// AI ANALYSIS
// ===============================

async function analyzeReport(description) {
  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    input: `
Analyze this civic issue:

"${description}"

Return ONLY valid JSON in exactly this format:

{
  "category": "",
  "severity": "",
  "urgency": "",
  "department": "",
  "reason": "",
  "impactScore": 0
}

Rules:
- category: road, streetlight, garbage, water, traffic, or other
- severity: low, medium, high, or critical
- urgency: low, medium, high, or critical
- impactScore: number from 0 to 100
- department: the government department that should handle the issue
- reason: short explanation for the severity and impact score
`
  });

  return JSON.parse(response.output_text);
}

// ===============================
// FALLBACK ANALYSIS
// ===============================

function fallbackAnalysis(description) {
  const text = description.toLowerCase();

  let category = "other";
  let severity = "medium";
  let urgency = "medium";
  let department = "General Civic Department";
  let impactScore = 50;
  let reason =
    "The issue requires review by the concerned civic department.";

  // Garbage
  if (
    text.includes("garbage") ||
    text.includes("waste") ||
    text.includes("trash")
  ) {
    category = "garbage";
    department = "Municipal Sanitation";
    impactScore = 65;
    reason =
      "Accumulated waste can create hygiene and public-health risks.";
  }

  // Road
  else if (
    text.includes("pothole") ||
    text.includes("road damage")
  ) {
    category = "road";
    department = "Municipal Roads Department";
    impactScore = 75;
    reason =
      "Road damage can cause accidents and disrupt transportation.";
  }

  // Streetlight
  if (
    text.includes("streetlight") ||
    text.includes("street light") ||
    text.includes("lamp")
  ) {
    category = "streetlight";
    department = "Electrical Maintenance Department";
    impactScore = 45;
    reason =
      "A damaged streetlight can reduce visibility and create safety risks.";
  }

  // Water
  if (
    text.includes("water") ||
    text.includes("leakage") ||
    text.includes("sewage")
  ) {
    category = "water";
    department = "Water and Sanitation Department";
    impactScore = 70;
    reason =
      "Water or sanitation problems can affect health and daily life.";
  }

  // Traffic
  if (
    text.includes("traffic") ||
    text.includes("signal") ||
    text.includes("congestion")
  ) {
    category = "traffic";
    department = "Traffic Management Department";
    impactScore = 70;
    reason =
      "The issue may affect traffic flow and public safety.";
  }

  // High impact situations
  if (
    text.includes("school") ||
    text.includes("hospital") ||
    text.includes("accident") ||
    text.includes("blocking")
  ) {
    severity = "high";
    urgency = "high";
    impactScore += 15;
    reason +=
      " Its location or effect increases the public impact.";
  }

  // Critical situations
  if (
    text.includes("dangerous") ||
    text.includes("emergency") ||
    text.includes("critical")
  ) {
    severity = "critical";
    urgency = "critical";
    impactScore += 10;
  }

  return {
    category,
    severity,
    urgency,
    department,
    reason,
    impactScore: Math.min(impactScore, 100)
  };
}

// ===============================
// TEST ROUTE
// ===============================

app.get("/", (req, res) => {
  res.send("CivicFix AI Backend is working!");
});

app.get("/test", (req, res) => {
  res.send("Backend is working");
});

// ===============================
// CREATE NEW REPORT
// ===============================

app.post("/api/reports", async (req, res) => {
  try {
    const report = req.body;

    let aiAnalysis;

    try {
      aiAnalysis = await analyzeReport(report.description);
    } catch (error) {
      console.log(
        "OpenAI unavailable. Using fallback analysis."
      );

      aiAnalysis = fallbackAnalysis(report.description);
    }

    const savedReport = await Report.create({
      ...report,
      aiCategory: aiAnalysis.category,
      aiSeverity: aiAnalysis.severity,
      urgency: aiAnalysis.urgency,
      department: aiAnalysis.department,
      reason: aiAnalysis.reason,
      impactScore: aiAnalysis.impactScore,
      status: "Pending"
    });

    console.log("AI Analysis:", aiAnalysis);

    res.json({
      message: "Report analyzed successfully",
      report: savedReport
    });

  } catch (error) {
    console.log("Error:", error.message);

    res.status(500).json({
      message: "Failed to analyze report"
    });
  }
});

// ===============================
// GET ALL REPORTS
// ===============================

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({
      impactScore: -1
    });

    res.json(reports);

  } catch (error) {
    console.log(
      "Error fetching reports:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch reports"
    });
  }
});

// ===============================
// UPDATE REPORT STATUS
// ===============================
// We use POST here instead of PATCH
// to keep the button functionality simple.

app.post("/api/reports/update-status", async (req, res) => {
  try {
    const { id, status } = req.body;

    console.log("STATUS UPDATE REQUEST");
    console.log("Report ID:", id);
    console.log("New Status:", status);

    if (!id || !status) {
      return res.status(400).json({
        message: "Report ID and status are required"
      });
    }

    const updatedReport =
      await Report.findByIdAndUpdate(
        id,
        {
          $set: {
            status: status
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

    if (!updatedReport) {
      return res.status(404).json({
        message: "Report not found"
      });
    }

    console.log(
      "Status updated successfully:",
      updatedReport.status
    );

    res.status(200).json(updatedReport);

  } catch (error) {
    console.log(
      "Update error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to update status",
      error: error.message
    });
  }
});

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(
      "MongoDB connected successfully"
    );
  })
  .catch((error) => {
    console.log(
      "MongoDB connection failed:",
      error.message
    );
  });

// ===============================
// START SERVER
// ===============================

app.listen(5000, () => {
  console.log(
    "civicfix-AI server running on port 5000"
  );
});