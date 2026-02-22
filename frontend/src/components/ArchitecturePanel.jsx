import React from "react";

// Clean, minimalist tech badge component
const TechBadge = ({ name }) => <span className="tech-badge">{name}</span>;

export default function ArchitecturePanel() {
  return (
    <div className="architecture-panel">
      {/* ── Minimalist CSS for specific elements in this panel ── */}
      <style>{`
        .tech-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          background: var(--bg-sidebar);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }

        .tech-badge:hover {
          background: var(--bg-card-hover);
          border-color: var(--text-secondary);
        }

        .icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--bg-sidebar);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
      `}</style>

      <div
        className="panel-header"
        style={{ textAlign: "center", marginBottom: "16px" }}
      >
        <h2>System Architecture</h2>
        <p className="panel-sub" style={{ margin: "0 auto" }}>
          A high-performance, syllabus-aware AI learning platform. Built with
          modern, asynchronous frameworks and a locally vectorized
          Retrieval-Augmented Generation (RAG) pipeline.
        </p>
      </div>

      {/* ── Clean Tech Stack Grid ── */}
      <div className="metrics-grid" style={{ marginBottom: "32px" }}>
        {/* Frontend Card */}
        <div className="advanced-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div className="icon-box">🎨</div>
            <h3 className="card-title" style={{ fontSize: "20px", margin: 0 }}>
              Frontend UI
            </h3>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <TechBadge name="React 18" />
            <TechBadge name="Vite" />
            <TechBadge name="Zustand" />
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Lightning-fast Single Page Application rendered via{" "}
            <strong>Vite</strong>. Global state is natively persisted using{" "}
            <strong>Zustand</strong>. The UI employs a pure structural CSS
            architecture to render real-time Markdown and KaTeX math equations
            cleanly.
          </p>
        </div>

        {/* Backend Card */}
        <div className="advanced-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div className="icon-box">⚙️</div>
            <h3 className="card-title" style={{ fontSize: "20px", margin: 0 }}>
              Backend API
            </h3>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <TechBadge name="Python 3" />
            <TechBadge name="FastAPI" />
            <TechBadge name="Pydantic" />
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Driven by a highly concurrent <strong>FastAPI</strong> ASGI server.
            Endpoints enforce strict type-hinting and payload validation using{" "}
            <strong>Pydantic</strong>. The backend architecture elegantly
            isolates LLM execution, vector math, and local analytics.
          </p>
        </div>

        {/* Engine Card */}
        <div className="advanced-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div className="icon-box">🧠</div>
            <h3 className="card-title" style={{ fontSize: "20px", margin: 0 }}>
              AI & ML Engine
            </h3>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <TechBadge name="ChromaDB" />
            <TechBadge name="SentenceTransformers" />
            <TechBadge name="Gemini / Claude" />
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Documents are intelligently chunked and vectorized via{" "}
            <strong>all-MiniLM-L6-v2</strong> into a local{" "}
            <strong>ChromaDB</strong> space. Queries perform cosine-similarity
            searches to ground LLM generations entirely in your syllabus
            context.
          </p>
        </div>

        {/* Storage Card */}
        <div className="advanced-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div className="icon-box">💾</div>
            <h3 className="card-title" style={{ fontSize: "20px", margin: 0 }}>
              Memory & Storage
            </h3>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <TechBadge name="SQLite (Relational)" />
            <TechBadge name="Local Storage" />
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Employs a dual-database architecture. <code>studyai_memory.db</code>{" "}
            maintains conversational state for multi-turn context injection,
            while <code>studyai_insights.db</code> logs quantitative data for
            the frontend analytics tracking.
          </p>
        </div>
      </div>

      {/* ── 5-Step RAG Data Pipeline Timeline ── */}
      <h3
        style={{
          fontSize: "24px",
          marginBottom: "24px",
          textAlign: "center",
          fontWeight: "700",
          color: "var(--text-primary)",
        }}
      >
        The RAG Data Pipeline
      </h3>

      <div className="advanced-card" style={{ padding: "40px 48px" }}>
        
        <div className="timeline-container">
          {/* Step 1 */}
          <div className="timeline-item">
            <div className="timeline-line"></div>
            <div className="step-number">1</div>
            <div className="timeline-content">
              <h3 className="timeline-title">Document Ingestion & Chunking</h3>
              <p className="timeline-desc">
                Syllabus files are parsed via PyPDF and split into overlapping
                chunks (e.g., 400 words). The algorithm uses overlap to ensure
                no context is lost between page breaks or paragraphs.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="timeline-item">
            <div className="timeline-line"></div>
            <div className="step-number">2</div>
            <div className="timeline-content">
              <h3 className="timeline-title">Vector Embedding Generation</h3>
              <p className="timeline-desc">
                Each text chunk is processed through a dense embedding model
                (like text-embedding-ada-002) to convert the semantic meaning of
                the text into high-dimensional mathematical vector arrays.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="timeline-item">
            <div className="timeline-line"></div>
            <div className="step-number">3</div>
            <div className="timeline-content">
              <h3 className="timeline-title">Vector Database Indexing</h3>
              <p className="timeline-desc">
                The generated vectors, along with their original text metadata,
                are stored in a specialized Vector Database optimized for
                ultra-fast, highly scalable similarity searches.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="timeline-item">
            <div className="timeline-line"></div>
            <div className="step-number">4</div>
            <div className="timeline-content">
              <h3 className="timeline-title">Query Processing & Retrieval</h3>
              <p className="timeline-desc">
                When you ask a question, it is converted into a vector. The
                engine then performs a mathematical similarity search to
                instantly fetch the top 3-5 most relevant chunks directly from
                your syllabus.
              </p>
            </div>
          </div>

          {/* Step 5 (Last item has no timeline-line) */}
          <div className="timeline-item">
            <div className="step-number">5</div>
            <div className="timeline-content">
              <h3 className="timeline-title">LLM Synthesis & Generation</h3>
              <p className="timeline-desc">
                The retrieved syllabus chunks are injected into the prompt along
                with your question. StudyAI uses this exact context to generate
                an accurate, hallucination-free response grounded only in your
                materials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
