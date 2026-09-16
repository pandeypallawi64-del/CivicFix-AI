import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --------------------------------------------------
// Fix Leaflet marker icon
// --------------------------------------------------

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --------------------------------------------------
// Reverse geocoding
// Coordinates → Address
// --------------------------------------------------

async function getAddressFromCoordinates(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }

    const data = await response.json();

    return data.display_name || `${lat}, ${lng}`;
  } catch (error) {
    console.log("Reverse geocoding error:", error);

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// --------------------------------------------------
// Map click handler
// --------------------------------------------------

function LocationMarker({
  setCoordinates,
  setLocation,
  setError,
}) {
  useMapEvents({
    click: async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      console.log("Map clicked:", lat, lng);

      setCoordinates({
        lat,
        lng,
      });

      setError("");

      const address = await getAddressFromCoordinates(
        lat,
        lng
      );

      setLocation(address);
    },
  });

  return null;
}

// --------------------------------------------------
// Move map when coordinates change
// --------------------------------------------------

function MapController({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo(
        [coordinates.lat, coordinates.lng],
        15,
        {
          duration: 1.5,
        }
      );
    }
  }, [coordinates, map]);

  return null;
}

// --------------------------------------------------
// Main Report Form
// --------------------------------------------------

function ReportForm({ onClose }) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [location, setLocation] = useState("");

  const [coordinates, setCoordinates] = useState(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // ------------------------------------------------
  // Search typed location
  // ------------------------------------------------

  const searchLocation = async () => {
    if (!location.trim()) {
      setError("Please enter a location first.");
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          location
        )}&limit=1`
      );

      if (!response.ok) {
        throw new Error("Location search failed");
      }

      const data = await response.json();

      if (data.length === 0) {
        setError(
          "Location not found. Try a more specific location."
        );
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      console.log("Location found:", lat, lng);

      setCoordinates({
        lat,
        lng,
      });

      if (data[0].display_name) {
        setLocation(data[0].display_name);
      }

      setError("");
    } catch (error) {
      console.log("Location search error:", error);

      setError(
        "Unable to find this location. Please try again."
      );
    }
  };

  // ------------------------------------------------
  // Submit report
  // ------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !description ||
      !category ||
      !severity ||
      !location
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (!coordinates) {
      setError(
        "Please select the issue location on the map."
      );
      return;
    }

    setLoading(true);
    setSuccess(false);
    setError("");

    const report = {
      description,
      category,
      severity,
      location,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    };

    console.log("Submitting report:", report);

    try {
      const response = await fetch(
        "https://civicfix-ai-backend-xcjg.onrender.com/api/reports",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(report),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      const data = await response.json();

      console.log(
        "Report submitted successfully:",
        data
      );

      setSuccess(true);

      // Close report form after successful submission
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1000);

    } catch (error) {
      console.log("Submission error:", error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // UI
  // ------------------------------------------------

  return (
    <form onSubmit={handleSubmit}>

      <h2>Report a Civic Issue</h2>

      {/* Description */}

      <label>Issue Description</label>

      <textarea
        placeholder="Describe the civic issue"
        value={description}
        onChange={(e) =>
          setDescription(e.target.value)
        }
      />

      {/* Category */}

      <label>Issue Category</label>

      <select
        value={category}
        onChange={(e) =>
          setCategory(e.target.value)
        }
      >
        <option value="">
          Select a category
        </option>

        <option value="road">
          Road Damage
        </option>

        <option value="streetlight">
          Streetlight
        </option>

        <option value="garbage">
          Garbage
        </option>

        <option value="water">
          Water / Sanitation
        </option>

        <option value="traffic">
          Traffic
        </option>

        <option value="other">
          Other
        </option>
      </select>

      {/* Severity */}

      <label>Severity</label>

      <select
        value={severity}
        onChange={(e) =>
          setSeverity(e.target.value)
        }
      >
        <option value="">
          Select severity
        </option>

        <option value="low">
          Low
        </option>

        <option value="medium">
          Medium
        </option>

        <option value="high">
          High
        </option>

        <option value="critical">
          Critical
        </option>
      </select>

      {/* Location */}

      <label>Issue Location</label>

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Enter location e.g. Main Road, Ranchi"
          value={location}
          onChange={(e) =>
            setLocation(e.target.value)
          }
          style={{
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={searchLocation}
        >
          Find on Map
        </button>
      </div>

      {/* Map */}

      <label
        style={{
          display: "block",
          marginTop: "15px",
        }}
      >
        Select Issue Location on Map
      </label>

      <p
        style={{
          fontSize: "14px",
          color: "#666",
        }}
      >
        Search for a location or click directly
        on the map.
      </p>

      <MapContainer
        center={[23.3441, 85.3096]}
        zoom={13}
        style={{
          height: "350px",
          width: "100%",
          marginTop: "10px",
          marginBottom: "15px",
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker
          setCoordinates={setCoordinates}
          setLocation={setLocation}
          setError={setError}
        />

        <MapController
          coordinates={coordinates}
        />

        {coordinates && (
          <Marker
            position={[
              coordinates.lat,
              coordinates.lng,
            ]}
          />
        )}

      </MapContainer>

      {/* Coordinates */}

      {coordinates && (
        <p>
          📍 Selected Location:{" "}
          <strong>
            {coordinates.lat.toFixed(5)},{" "}
            {coordinates.lng.toFixed(5)}
          </strong>
        </p>
      )}

      {/* Submit */}

      <button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Analyzing with AI..."
          : "Submit Report"}
      </button>

      {/* Success */}

      {success && (
        <p>
          ✅ Report submitted successfully!
          AI has analyzed the issue.
        </p>
      )}

      {/* Error */}

      {error && (
        <p>
          ❌ {error}
        </p>
      )}

    </form>
  );
}
  
export default ReportForm;