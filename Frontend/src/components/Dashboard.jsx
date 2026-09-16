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
      .then((response) => response.json())
      .then((data) => {
        setReports(data);
      })
      .catch((error) => {
        console.log(
          "Error fetching reports:",
          error
        );
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

      {reports.map((report) => (
        <div
          className="report-card"
          key={report._id}
        >
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