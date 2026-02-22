import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion"; // 1. Import Framer Motion
import { useStore } from "./store";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import UploadPanel from "./components/UploadPanel";
import InsightsPanel from "./components/InsightsPanel";
import ArchitecturePanel from "./components/ArchitecturePanel";
import SetupModal from "./components/SetupModal";
import "./components/styles.css";

export default function App() {
  const { session, activeView, theme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--glass-base)",
            color: "var(--text)",
            border: "1px solid var(--glass-border)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            backdropFilter: "blur(20px)",
          },
          success: {
            iconTheme: { primary: "var(--accent)", secondary: "#000" },
          },
          error: { iconTheme: { primary: "var(--err)", secondary: "#fff" } },
        }}
      />

      {/* ── NEW: Video Background & Dark Overlay ── */}
      <video autoPlay loop muted playsInline className="video-background">
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="video-overlay"></div>
      {/* ──────────────────────────────────────── */}

      {!session && <SetupModal />}

      <div className="app-layout">
        <Sidebar />
        <main className="main-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
            >
              {activeView === "chat" && <ChatPanel />}
              {activeView === "upload" && <UploadPanel />}
              {activeView === "insights" && <InsightsPanel />}
              {activeView === "architecture" && <ArchitecturePanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}
