import { useEffect } from "react";
import { useStore } from "../store";
import { motion } from "framer-motion";
import { useState } from "react";

export default function InsightsPanel() {
  const { insights, getElapsedSessionTime, setInsights } = useStore();
  const [sessionDisplay, setSessionDisplay] = useState("0m");

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionDisplay(getElapsedSessionTime());
    }, 10000);
    setSessionDisplay(getElapsedSessionTime());
    return () => clearInterval(interval);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div
      className="insights-panel"
      style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "48px" }}>
        <h1
          style={{ fontSize: "42px", fontWeight: "800", marginBottom: "8px" }}
        >
          Daily Monitoring
        </h1>
        <p style={{ color: "var(--text3)", fontSize: "16px" }}>
          Tracking your syllabus mastery and interaction velocity.
        </p>
      </header>

      {/* Top Metrics Row */}
      <motion.div
        className="metrics-grid"
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        <MetricCard
          variants={item}
          icon="🔥"
          label="Study Streak"
          value="5 Days"
          color="#fff"
        />
        <MetricCard
          variants={item}
          icon="🧠"
          label="Concepts Mastered"
          value={insights?.total_questions || 0}
          color="#fff"
        />
        <MetricCard
          variants={item}
          icon="⏱️"
          label="Avg. Session"
          value="42m"
          color="#fff"
        />
        <MetricCard
          variants={item}
          icon="📈"
          label="Retention Rate"
          value="88%"
          color="#fff"
        />
        <MetricCard
          icon="⏱️"
          label="Current Session"
          value={sessionDisplay}
          color="#fff"
        />
      </motion.div>
<button 
  className="clear-all-btn" 
  onClick={() => {
    if(window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
      clearAllHistory();
    }
  }}
>
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
  Clear All History
</button>
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}
      >
        {/* Activity Tracker */}
        <motion.div
          className="advanced-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ padding: "32px" }}
        >
          <h3 style={{ marginBottom: "24px" }}>Learning Velocity (7 Days)</h3>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: "200px",
              paddingTop: "20px",
            }}
          >
            {[40, 70, 45, 90, 65, 80, 95].map((height, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  width: "12%",
                }}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  style={{
                    width: "100%",
                    background: "var(--accent)",
                    borderRadius: "6px 6px 0 0",
                  }}
                />
                <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Friction Points */}
        <motion.div
          className="advanced-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ padding: "32px" }}
        >
          <h3 style={{ marginBottom: "20px" }}>Friction Points ⚠️</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {insights?.confusion_areas?.length > 0 ? (
              insights.confusion_areas.map((area, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px",
                    borderLeft: "2px solid #fff",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <p style={{ fontSize: "14px" }}>{area}</p>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text3)", fontSize: "14px" }}>
                No roadblocks detected today.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, variants }) {
  return (
    <motion.div
      variants={variants}
      className="advanced-card"
      style={{
        padding: "24px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <div style={{ fontSize: "32px" }}>{icon}</div>
      <div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: "28px", fontWeight: "800" }}>{value}</div>
      </div>
    </motion.div>
  );
}
