import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Core State ────────────────────────────────────────────────────────
      theme: "dark",
      session: null,
      sessionStartTime: Date.now(), // <-- NEW: Added this tracking variable
      messages: [],
      chatHistory: {},
      activeView: "chat",
      level: "intermediate",
      mode: "quick",

      getElapsedSessionTime: () => {
        if (!get().sessionStartTime) return "0m";
        const diff = Date.now() - get().sessionStartTime;
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m`;
      },
      // Add these to your useStore initial state
      activeTopic: "General Learning",
      topicProgress: 0,
      roadmapData: [],

      // Add these actions
      setActiveTopic: (topic) => set({ activeTopic: topic }),
      setRoadmapData: (data) => set({ roadmapData: data }),
      // ── Setters ───────────────────────────────────────────────────────────
      setSession: (s) =>
        set({
          session: s,
          messages: [],
          sessionStartTime: Date.now(),
        }),

      setActiveView: (v) => set({ activeView: v }),
      setLevel: (level) => set({ level }),
      setMode: (mode) => set({ mode }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      // ── History Management ────────────────────────────────────────────────
      addMessage: (msg) => {
        const currentSession = get().session;
        if (!currentSession) return;

        const sid = currentSession.session_id;

        set((state) => {
          const newMessages = [...state.messages, msg];
          const existingHistory = state.chatHistory[sid] || {
            title: msg.content.substring(0, 35) + "...",
            timestamp: Date.now(),
            messages: [],
          };

          return {
            messages: newMessages,
            chatHistory: {
              ...state.chatHistory,
              [sid]: {
                ...existingHistory,
                messages: newMessages,
              },
            },
          };
        });
      },

      loadChat: (sid) => {
        const chat = get().chatHistory[sid];
        if (chat) {
          set({
            messages: chat.messages || [],
            session: { session_id: sid, student_name: "User" },
          });
        }
      },

      deleteChat: (sid) => {
        set((state) => {
          const newHistory = { ...state.chatHistory };
          delete newHistory[sid];

          const isCurrent = state.session?.session_id === sid;
          return {
            chatHistory: newHistory,
            messages: isCurrent ? [] : state.messages,
            session: isCurrent ? null : state.session,
          };
        });
      },

      clearAllHistory: () => {
        if (window.confirm("Purge all chat history? This cannot be undone.")) {
          set({ chatHistory: {}, messages: [], session: null });
        }
      },

      // ── Document State ───────────────────────────────────────────────────
      documents: [],
      setDocuments: (docs) => set({ documents: docs }),
      addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
      removeDocument: (docId) =>
        set((s) => ({
          documents: s.documents.filter((d) => d.doc_id !== docId),
        })),
    }),
    {
      name: "studyai-storage",
      // Only persist these specific fields
      partialize: (state) => ({
        theme: state.theme,
        chatHistory: state.chatHistory,
        level: state.level,
        mode: state.mode,
      }),
    },
  ),
);
