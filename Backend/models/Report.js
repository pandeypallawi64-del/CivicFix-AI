const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({

  description: String,

  category: String,

  severity: String,

  location: String,

  // Map coordinates
  latitude: {
    type: Number
  },

  longitude: {
    type: Number
  },

  aiCategory: String,

  aiSeverity: String,

  urgency: String,

  department: String,

  reason: String,

  impactScore: Number,

  status: {
    type: String,
    default: "Pending"
  }

});

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;