import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ReportForm from "./components/ReportForm";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div>
      <Navbar />

      {!showReportForm && (
        <Hero
          onReportClick={() => setShowReportForm(true)}
        />
      )}

      {showReportForm ? (
        <ReportForm
          onClose={() => setShowReportForm(false)}
        />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

export default App;