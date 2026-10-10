import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  
const [complaints, setComplaints] = useState({});
const [complaintLoading, setComplaintLoading] = useState({});
const [copySuccess, setCopySuccess] = useState({});
  // ===============================
// GOVERNMENT ACTION LINKS
// ===============================


const actionLinks = {
  garbage: {
    title: "Municipal Sanitation Grievance",
    description: "Report garbage accumulation and sanitation problems to your municipal authority.",
    url: "https://municipalservices.jharkhand.gov.in/grievance_new/login"
  },
  road: {
    title: "Road Damage Grievance",
    description: "Report potholes and damaged roads to the relevant road authority.",
    url: "https://municipalservices.jharkhand.gov.in/grievance_new/login"
  },
  streetlight: {
    title: "Streetlight Grievance",
    description: "Report faulty streetlights to your municipal authority.",
    url: "https://municipalservices.jharkhand.gov.in/grievance_new/login"
  },
  water: {
    title: "Water and Drainage Grievance",
    description: "Report water supply, leakage, drainage, or waterlogging problems.",
    url: "https://municipalservices.jharkhand.gov.in/grievance_new/login"
  },
  traffic: {
    title: "Traffic or Public Grievance",
    description: "Use the government grievance portal to identify the appropriate authority.",
    url: "https://pgportal.gov.in/Home/LodgeGrievance"
  },
  other: {
    title: "General Government Grievance",
    description: "Find the appropriate government authority for this issue.",
    url: "https://pgportal.gov.in/Home/LodgeGrievance"
  }
};

  // ===============================
  // UPDATE REPORT STATUS
  // ===============================
  const updateStatus = async (id, newStatus) => {
    try {
      console.log("Button clicked");
      console.log("Report ID:", id);
      console.log("New status:", newStatus);

      const response = await fetch(
        "http://localhost:5000/api/reports/update-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: id,
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Server error: ${response.status}`
        );
      }

      setReports((previousReports) =>
        previousReports.map((report) =>
          report._id === id ? data : report
        )
      );

      console.log("Status updated successfully!");
    } catch (error) {
      console.log(
        "Error updating status:",
        error.message
      );
    }
  };

  const deleteReport = async (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this report?"
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:5000/api/reports/${id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to delete report"
      );
    }

    // Remove deleted report from Dashboard immediately
    setReports((previousReports) =>
      previousReports.filter(
        (report) => report._id !== id
      )
    );

    console.log("Report deleted successfully!");

  } catch (error) {
    console.log(
      "Delete error:",
      error.message
    );

    alert(
      "Failed to delete report. Please try again."
    );
  }
};


const copyComplaint = async (reportId, complaint) => {
  const textToCopy = `${complaint.subject}\n\n${complaint.complaint}`;

  try {
    await navigator.clipboard.writeText(textToCopy);

    setCopySuccess((previous) => ({
      ...previous,
      [reportId]: "Complaint copied successfully!"
    }));
  } catch (error) {
    console.error("Clipboard copy failed:", error);

    setCopySuccess((previous) => ({
      ...previous,
      [reportId]: "Copy failed. Please select and copy the text manually."
    }));
  }
};

const generateComplaint = async (report) => {
  try {
    setComplaintLoading((previous) => ({
      ...previous,
      [report._id]: true,
    }));

    const response = await fetch(
      "http://localhost:5000/api/reports/generate-complaint",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: report.description,
          category: report.aiCategory || report.category,
          severity: report.aiSeverity || report.severity,
          urgency: report.urgency,
          department: report.department,
          location: report.location,
          reason: report.reason,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not generate complaint"
      );
    }

    setComplaints((previous) => ({
      ...previous,
      [report._id]: data,
    }));
  } catch (error) {
    console.error("Complaint generation error:", error);
    alert("Could not generate the complaint. Please try again.");
  } finally {
    setComplaintLoading((previous) => ({
      ...previous,
      [report._id]: false,
    }));
  }
};

  // ===============================
  // STATISTICS
  // ===============================

  const highPriority = reports.filter(
    (report) => report.aiSeverity === "high"
  ).length;

  const criticalReports = reports.filter(
    (report) => report.aiSeverity === "critical"
  ).length;

  const averageImpact =
    reports.length > 0
      ? Math.round(
          reports.reduce(
            (total, report) =>
              total + (report.impactScore || 0),
            0
          ) / reports.length
        )
      : 0;

  // ===============================
  // FETCH REPORTS
  // ===============================

  
useEffect(() => {
  fetch("http://localhost:5000/api/reports")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      return response.json();
    })
    .then((data) => {
      setReports(
        Array.isArray(data) ? data : data.reports || []
      );
    })
    .catch((error) => {
      console.log("Error fetching reports:", error);
      setReports([]);
    });
}, []);

  // ===============================
  // DASHBOARD UI
  // ===============================

  return (
    <section>
      <h2>CivicFix AI Dashboard</h2>

      {/* ===============================
          STATISTICS
      =============================== */}

      <div className="stats">
        <div className="stat-card">
          <h3>Total Reports</h3>
          <p>{reports.length}</p>
        </div>

        <div className="stat-card">
          <h3>High Priority</h3>
          <p>{highPriority}</p>
        </div>

        <div className="stat-card">
          <h3>Critical</h3>
          <p>{criticalReports}</p>
        </div>

        <div className="stat-card">
          <h3>Average Impact</h3>
          <p>{averageImpact}/100</p>
        </div>
      </div>

      {/* ===============================
          REPORTED ISSUES MAP
      =============================== */}

      <h3>Reported Issues Map</h3>

      <MapContainer
        center={[23.3441, 85.3096]}
        zoom={13}
        style={{
          height: "450px",
          width: "100%",
          marginBottom: "30px",
          borderRadius: "12px",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports
          .filter(
            (report) =>
              typeof report.latitude === "number" &&
              typeof report.longitude === "number"
          )
          .map((report) => (
            <Marker
              key={report._id}
              position={[
                report.latitude,
                report.longitude,
              ]}
            >
              <Popup>
                <strong>
                  {report.description}
                </strong>

                <br />

                Category:{" "}
                {report.aiCategory ||
                  report.category ||
                  "N/A"}

                <br />

                Severity:{" "}
                {report.aiSeverity ||
                  report.severity ||
                  "N/A"}

                <br />

                Status:{" "}
                {report.status || "Pending"}

                <br />

                AI Impact:{" "}
                {report.impactScore || 0}/100
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* ===============================
          REPORTS
      =============================== */}
      <div className="filter-section">
  <label htmlFor="statusFilter">Filter by Status:</label>

  <select
    id="statusFilter"
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="All">All Statuses</option>
    <option value="Pending">Pending</option>
    <option value="In Progress">In Progress</option>
    <option value="Resolved">Resolved</option>
  </select>
</div>
  
      {reports
        .filter(
          (report) =>
            statusFilter === "All" ||
            (report.status || "Pending") === statusFilter
        )
        .map((report) => (
          <div className="report-card" key={report._id}>
            {/* EVIDENCE IMAGE */}

{report.imageUrl && (
  <div style={{ marginBottom: "15px" }}>
    <img
      src={report.imageUrl}
      alt="Civic issue evidence"
      style={{
        width: "100%",
        maxWidth: "500px",
        maxHeight: "350px",
        objectFit: "cover",
        borderRadius: "12px",
        display: "block",
      }}
    />
  </div>
)}
          {/* DESCRIPTION */}

          <h3>{report.description}</h3>

          {/* PRIORITY */}

          <span
            className={`priority-badge ${
              report.aiSeverity || ""
            }`}
          >
            {report.aiSeverity || "Pending"}
          </span>

          {/* CATEGORY */}

          <p>
            <strong>Category:</strong>{" "}
            {report.aiCategory || "N/A"}
          </p>

          {/* SEVERITY */}

          <p>
            <strong>Severity:</strong>{" "}
            {report.aiSeverity || "N/A"}
          </p>

          {/* URGENCY */}

          <p>
            <strong>Urgency:</strong>{" "}
            {report.urgency || "N/A"}
          </p>

          {/* DEPARTMENT */}

          <p>
            <strong>Department:</strong>{" "}
            {report.department || "N/A"}
          </p>

          
{/* GOVERNMENT ACTION HUB */}
{(() => {
  const action =
    actionLinks[report.aiCategory || report.category] ||
    actionLinks.other;

  return (
    <div className="government-action-card">
      <h4>🏛️ Government Action Hub</h4>

      <h5>{action.title}</h5>
      <p>{action.description}</p>

      <a
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Government Portal ↗
      </a>

      <p className="government-action-note">
        Review your complaint and submit it on the official
        portal. CivicFix-AI does not submit it automatically.
      </p>
    </div>
  );
})()}

          

{/* AI COMPLAINT GENERATOR */}

<div className="complaint-assistant">
  <h4>🤖 AI Complaint Assistant</h4>

  <button
    onClick={() => generateComplaint(report)}
    disabled={!!complaintLoading[report._id]}
  >
    {complaintLoading[report._id]
      ? "Generating..."
      : complaints[report._id]
      ? "Regenerate Complaint"
      : "Generate Complaint"}
  </button>

  {complaints[report._id] && (
    <div>
      <h5>{complaints[report._id].subject}</h5>

      <textarea
        readOnly
        value={complaints[report._id].complaint}
        rows={8}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          marginBottom: "10px",
        }}
      />

      
<button
  onClick={() => copyComplaint(report._id, complaints[report._id])}
>
  📋 Copy Complaint
</button>

{copySuccess[report._id] && (
  <p role="status">
    {copySuccess[report._id]}
  </p>
)}
    </div>
  )}
</div>


          {/* STATUS */}

          <p>
            <strong>Status:</strong>{" "}

            <span
              className={`status-badge ${
                (report.status || "Pending")
                  .toLowerCase()
                  .replace(/\s+/g, "-")
              }`}
            >
              {report.status || "Pending"}
            </span>
          </p>

          {/* ===============================
              STATUS BUTTONS
          =============================== */}

        <div>
  <button
    onClick={() =>
      updateStatus(
        report._id,
        "Pending"
      )
    }
  >
    Pending
  </button>

  <button
    onClick={() =>
      updateStatus(
        report._id,
        "In Progress"
      )
    }
  >
    In Progress
  </button>

  <button
    onClick={() =>
      updateStatus(
        report._id,
        "Resolved"
      )
    }
  >
    Resolved
  </button>

  <button
    onClick={() =>
      deleteReport(report._id)
    }
  >
    Delete
  </button>
</div>

          {/* ===============================
              IMPACT SCORE
          =============================== */}

          <div className="impact-score">
            <div>
              <strong>
                AI Impact Score
              </strong>

              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{
                    width: `${
                      report.impactScore || 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <span>
              {report.impactScore || 0}/100
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

export default Dashboard;