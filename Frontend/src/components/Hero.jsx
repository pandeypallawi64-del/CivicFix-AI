function Hero({ onReportClick }) {
  return (
    <section className="hero">
      <h1>CivicFix AI</h1>

      <p>
        Report civic issues. Let AI analyze, prioritize, and help authorities act faster.
      </p>

      <button onClick={onReportClick}>
        Report an Issue
      </button>
    </section>
  );
}

export default Hero;