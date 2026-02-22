import React from "react";
import { useStore } from "../store";

export default function ProgressPanel() {
  const { activeTopic, roadmapData } = useStore();

  return (
    <div className="insights-panel">
      <div className="panel-header" style={{ textAlign: "center" }}>
        <h2>Learning Progress</h2>
        <p className="panel-sub" style={{ margin: "0 auto" }}>
          Personalized roadmap for{" "}
          <strong>{activeTopic || "General Studies"}</strong>
        </p>
      </div>

      <div className="advanced-card" style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "24px", fontWeight: "700" }}>
          Domain Roadmap
        </h3>
        <div className="timeline-container">
          {roadmapData && roadmapData.length > 0 ? (
            roadmapData.map((step, idx) => (
              <div className="timeline-item" key={idx}>
                {idx !== roadmapData.length - 1 && (
                  <div className="timeline-line"></div>
                )}
                <div className="step-number">{idx + 1}</div>
                <div className="timeline-content">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <h3
                      className="timeline-title"
                      style={{ fontWeight: "700", margin: 0 }}
                    >
                      {step.title}
                    </h3>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--accent-color)",
                        fontWeight: "600",
                      }}
                    >
                      {step.duration}
                    </span>
                  </div>
                  <p
                    className="timeline-desc"
                    style={{ margin: 0, opacity: 0.8 }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div
              className="empty-state"
              style={{
                padding: "40px",
                textAlign: "center",
                border: "2px dashed var(--border-light)",
                borderRadius: "16px",
              }}
            >
              <p style={{ color: "var(--text-secondary)" }}>
                Start a chat about a specific topic (e.g., "I want to learn ML")
                to generate your roadmap.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
