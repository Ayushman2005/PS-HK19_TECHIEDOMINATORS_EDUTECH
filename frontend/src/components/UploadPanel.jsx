import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { uploadDocument, listDocuments, deleteDocument } from "../api";
import { useStore } from "../store";

export default function UploadPanel() {
  const { documents, setDocuments, addDocument, removeDocument } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents || []);
    } catch {
      toast.error("Could not load documents");
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = [".pdf", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error(`Unsupported file type. Use: ${allowed.join(", ")}`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large (max 50MB)");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Vectorizing & indexing ${file.name}...`);

    try {
      // Hardcode "General" subject tag under the hood
      const res = await uploadDocument(file, "General");
      addDocument(res);
      toast.success("Vector embeddings successfully generated!", {
        id: toastId,
      });
    } catch (err) {
      toast.error(`Ingestion failed: ${err.message}`, { id: toastId });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Purge ${filename} from the vector store?`)) return;
    try {
      await deleteDocument(docId);
      removeDocument(docId);
      toast.success("Document purged");
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="upload-panel">
      <div className="panel-header" style={{ marginBottom: "40px" }}>
        <h2>Knowledge Base Engine</h2>
        <p className="panel-sub">
          Securely upload syllabus documents. Files are chunked and vectorized
          locally into ChromaDB to power the RAG pipeline.
        </p>
      </div>

      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div
          style={{
            fontSize: "64px",
            marginBottom: "24px",
            filter: "drop-shadow(0 10px 20px rgba(0,242,254,0.4))",
            transition: "transform 0.3s ease",
            transform: uploading ? "scale(1.1)" : "scale(1)",
          }}
        >
          {uploading ? "⚙️" : "☁️"}
        </div>
        <h3
          style={{
            fontSize: "28px",
            fontWeight: "800",
            marginBottom: "12px",
            color: "#fff",
          }}
        >
          {uploading
            ? "Processing Document Context..."
            : "Click or Drag to Ingest"}
        </h3>
        <p
          style={{
            color: "var(--text2)",
            fontSize: "15px",
            maxWidth: "400px",
            margin: "0 auto",
            lineHeight: "1.6",
          }}
        >
          {uploading
            ? "Generating high-dimensional embeddings via Sentence Transformers."
            : "Supported filetypes: PDF, TXT, MD. Maximum size 50MB per file."}
        </p>
        <input
          type="file"
          ref={fileRef}
          style={{ display: "none" }}
          accept=".pdf,.txt,.md"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginTop: "64px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "24px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "24px", fontWeight: "800", margin: 0 }}>
              Vector Store Registry
            </h3>
            <p
              style={{
                color: "var(--text2)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              {documents.length} File{documents.length !== 1 ? "s" : ""}{" "}
              currently indexed in local database.
            </p>
          </div>
          <button className="mode-pill" onClick={fetchDocs}>
            ↻ Sync Database
          </button>
        </div>

        {documents.length === 0 ? (
          <div
            className="advanced-card"
            style={{
              textAlign: "center",
              padding: "48px",
              color: "var(--text2)",
            }}
          >
            <span
              style={{
                fontSize: "32px",
                display: "block",
                marginBottom: "16px",
              }}
            >
              📭
            </span>
            The vector store is currently empty. Upload syllabus material to
            enable AI generation.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {documents.map((doc) => (
              <div
                key={doc.doc_id}
                className="advanced-card"
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "20px" }}
                >
                  <div
                    style={{
                      fontSize: "32px",
                      background: "rgba(255,255,255,0.05)",
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {doc.filename.endsWith(".pdf") ? "📕" : "📄"}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: "800",
                        fontSize: "16px",
                        color: "#fff",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {doc.filename}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--text3)",
                        marginTop: "6px",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <span>{doc.chunk_count} Data Chunks</span>
                      <span>{formatDate(doc.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  style={{
                    background: "rgba(252, 129, 129, 0.1)",
                    border: "1px solid rgba(252, 129, 129, 0.3)",
                    color: "var(--err)",
                    fontSize: "18px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => handleDelete(doc.doc_id, doc.filename)}
                  title={`Purge ${doc.filename}`}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.background =
                      "rgba(252, 129, 129, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background =
                      "rgba(252, 129, 129, 0.1)";
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
