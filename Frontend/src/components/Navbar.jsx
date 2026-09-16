function Navbar({ onReportClick }) {
  return (
    <nav>
      <h2>CivicFix AI</h2>

      <div>
        <a href="/">Home</a>

        <button onClick={onReportClick}>
          Report Issue
        </button>

        <a href="/">Dashboard</a>
      </div>
    </nav>
  );
}

export default Navbar;