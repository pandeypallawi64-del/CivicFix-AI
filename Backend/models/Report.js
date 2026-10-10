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

  // Uploaded evidence image
  imageUrl: {
    type: String,
    default: ""
  },

  imagePublicId: {
    type: String,
    default: ""
  },

  
  // AI image analysis results
  imageCategory: {
    type: String,
    default: ""
  },

  imageDescription: {
    type: String,
    default: ""
  },

  imageMatchesDescription: {
    type: Boolean,
    default: null
  },

  imageConfidence: {
    type: Number,
    default: 0
  },

  
imageAnalysisStatus: {
  type: String,
  enum: ["not_requested", "completed", "unavailable"],
  default: "not_requested"
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