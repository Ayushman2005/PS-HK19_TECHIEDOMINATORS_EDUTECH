import { useState } from "react";
import toast from "react-hot-toast";
import { createSession } from "../api";
import { useStore } from "../store";
import { motion } from "framer-motion";

export default function SetupModal() {
  const { setSession } = useStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setLoading(true);
    try {
      // Pass "General" as a fallback to satisfy the backend
      const data = await createSession(name.trim(), "General");
      setSession(data);
      toast.success(`Welcome, ${data.student_name}!`);
    } catch (err) {
      toast.error(`Could not connect to backend: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        className="modal-card"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
      >
      <div className="modal-card">
        <div className="modal-icon">✦</div>
        <h2 className="modal-title">Welcome to StudyAI</h2>
        <p className="modal-desc">
          Your syllabus-aware learning assistant. I answer questions
          <strong> only from your uploaded material</strong> — no
          hallucinations, no off-syllabus content, with full source attribution.
        </p>

        <div className="modal-features">
          <div className="feature-row">
            <span className="feature-icon">🎯</span>
            <span>RAG-powered — grounded in your syllabus</span>
          </div>
          <div className="feature-row">
            <span className="feature-icon">🧠</span>
            <span>Adapts explanation depth to your level</span>
          </div>
          <div className="feature-row">
            <span className="feature-icon">💬</span>
            <span>Multi-turn memory for contextual follow-ups</span>
          </div>
          <div className="feature-row">
            <span className="feature-icon">📊</span>
            <span>Tracks confusion areas and learning history</span>
          </div>
        </div>

        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Your Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              autoFocus
            />
          </div>

          <button
            className="modal-submit"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? "Connecting…" : "Start Learning →"}
          </button>
        </div>

        <p className="modal-hint">
          Backend must be running at <code>localhost:8000</code>
        </p>
      </div>
      </motion.div>
    </div>
  );
}
