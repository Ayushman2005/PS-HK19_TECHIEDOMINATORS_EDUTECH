import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import toast from "react-hot-toast";
import { askQuestion } from "../api";
import { useStore } from "../store";
import InteractiveQuiz from "./InteractiveQuiz";
import { useVoiceAssistant } from "../useVoice";
import html2pdf from "html2pdf.js";

const MODES = [
  { value: "quick", label: "Quick" },
  { value: "step-by-step", label: "Steps" },
  { value: "example-based", label: "Examples" },
  { value: "quiz", label: "Quiz" },
];

const SUGGESTIONS = [
  "Summarize the key concepts",
  "Generate a practice quiz",
  "Explain this to a beginner",
  "What are the practical applications?",
];

export default function ChatPanel() {
  const {
    session,
    messages,
    addMessage,
    level,
    setLevel,
    mode,
    setMode,
    subject,
    setActiveTopic, // Added from previous store update
    setRoadmapData, // Added from previous store update
  } = useStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    isListening,
    startListening,
    speakText,
    stopSpeaking,
    autoSpeak,
    setAutoSpeak,
    isSpeaking,
  } = useVoiceAssistant();

  const userName = session?.student_name || "Ayushman";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const greeting = getGreeting();

  const handleVoiceInput = (transcript) => {
    setInput(transcript);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const getExportHTML = (question, answer) => {
    const formatText = (text) =>
      String(text)
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>");

    return `
      <div style="font-family: sans-serif; color: #000; padding: 20px; background: #fff;">
        <h2 style="color: #6b21a8; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">StudyAI Q&A</h2>
        <h4 style="color: #333; margin-top: 20px;">Question:</h4>
        <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 20px;">${formatText(question)}</div>
        <h4 style="color: #6b21a8;">Answer:</h4>
        <div style="background: #faf5ff; padding: 10px; border-radius: 5px;">${formatText(answer)}</div>
      </div>
    `;
  };

  const exportSingleToPDF = (question, answer) => {
    const htmlContent = getExportHTML(question, answer);
    const opt = {
      margin: 0.5,
      filename: `StudyAI_QnA_${new Date().getTime()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(htmlContent).save();
  };

  const exportSingleToDoc = (question, answer) => {
    let htmlContent = "<html><head><meta charset='utf-8'></head><body>";
    htmlContent += getExportHTML(question, answer);
    htmlContent += "</body></html>";

    const blob = new Blob(["\ufeff", htmlContent], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StudyAI_QnA_${new Date().getTime()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendMessage = async (overrideText = null) => {
    const userText =
      typeof overrideText === "string" ? overrideText : input.trim();
    if (!userText || !session || loading) return;

    // Intent detection for roadmaps
    if (
      userText.toLowerCase().includes("learn") ||
      userText.toLowerCase().includes("roadmap")
    ) {
      const topic =
        userText.replace(/learn|roadmap for/gi, "").trim() || "New Subject";
      setActiveTopic(topic);
      setRoadmapData([
        {
          title: "Foundations",
          duration: "3 Hours",
          description: "Basic core concepts and setup.",
        },
        {
          title: "Implementation",
          duration: "5 Hours",
          description: "Hands-on logic and structured building.",
        },
        {
          title: "Advanced Application",
          duration: "6 Hours",
          description: "Integrating complex modules and testing.",
        },
      ]);
    }

    if (typeof overrideText !== "string") {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    addMessage({ role: "user", content: userText });
    setLoading(true);

    try {
      const payload = {
        question: `Provide a direct, summarized, and pointwise answer to the following question. 
                 The response must be written ONLY in the same language as the question. 
                 Do not include any links, images, or conversational fillers: "${userText}"`,
        session_id: session.session_id,
        student_level: level,
        explanation_mode: "quick",
        subject: subject || undefined,
      };

      const data = await askQuestion(payload);
      addMessage({
        role: "ai",
        content: data.answer || data.message || "No data retrieved.",
        suggestions: data.follow_up_suggestions,
      });
    } catch (err) {
      toast.error("Failed to get answer.");
    } finally {
      setLoading(false);
    }
  };

  const renderInputBox = () => (
    <div className="input-box-wrapper">
      <div className="input-core">
        <button
          className={`input-action-btn ${isListening ? "active-mic" : ""}`}
          onClick={() => startListening(handleVoiceInput)}
          disabled={loading || !session}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>

        {isSpeaking && (
          <button className="input-action-btn stop" onClick={stopSpeaking}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <rect x="6" y="6" width="12" height="12"></rect>
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          className="text-input"
          placeholder="Ask AI a question or make a request..."
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), sendMessage())
          }
          rows={1}
          disabled={!session}
        />

        <button
          className="send-action-btn"
          onClick={() => sendMessage()}
          /* Logic Fix: Button activates immediately as you type */
          disabled={loading || !input.trim()}
          style={{
            opacity: loading || !input.trim() ? 0.3 : 1,
            background: input.trim()
              ? "var(--text-primary)"
              : "var(--border-light)",
            transition: "all 0.2s ease",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </button>
      </div>

      <div className="input-controls-row">
        <select
          className="clean-select"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <div className="clean-modes">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={`clean-mode-btn ${mode === m.value ? "active" : ""}`}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pure-chat-layout">
      <div className="pure-top-bar">
        <div className="top-model-selector">
          StudyAI Engine
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="hero-center-area">
          <div className="hero-greeting">
            <div className="hero-orb"></div>
            <h1>
              {greeting}, {userName}
            </h1>
            <h2>What's on your mind?</h2>
          </div>

          <div className="hero-input-container">{renderInputBox()}</div>

          <div className="hero-suggestions-grid">
            <div className="suggestion-header">
              GET STARTED WITH AN EXAMPLE BELOW
            </div>
            <div className="suggestion-cards">
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  className="suggestion-card"
                  onClick={() => sendMessage(sug)}
                >
                  <div className="card-text">{sug}</div>
                  <svg
                    className="card-icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="active-chat-area">
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div key={idx} className={`pure-message-row ${msg.role}`}>
                <div className="pure-avatar">
                  {msg.role === "ai" ? (
                    <div className="ai-orb-small"></div>
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="pure-message-content">
                  {(() => {
                    if (msg.role === "ai") {
                      try {
                        const cleanStr = msg.content
                          .replace(/```json/g, "")
                          .replace(/```/g, "")
                          .trim();
                        const parsedData = JSON.parse(cleanStr);
                        if (
                          Array.isArray(parsedData) &&
                          parsedData[0]?.question &&
                          parsedData[0]?.options
                        ) {
                          return <InteractiveQuiz quizData={parsedData} />;
                        }
                      } catch (e) {}
                    }

                    return (
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            code({
                              node,
                              inline,
                              className,
                              children,
                              ...props
                            }) {
                              const match = /language-(\w+)/.exec(
                                className || "",
                              );
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {String(msg.content || " ")}
                        </ReactMarkdown>

                        {msg.role === "ai" && (
                          <div className="pure-actions-row">
                            <button
                              className="action-link"
                              onClick={() =>
                                exportSingleToPDF(
                                  idx > 0
                                    ? messages[idx - 1].content
                                    : "Context",
                                  msg.content,
                                )
                              }
                            >
                              Export PDF
                            </button>
                            <button
                              className="action-link"
                              onClick={() =>
                                exportSingleToDoc(
                                  idx > 0
                                    ? messages[idx - 1].content
                                    : "Context",
                                  msg.content,
                                )
                              }
                            >
                              Export DOC
                            </button>
                          </div>
                        )}

                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="pure-suggestions-row">
                            {msg.suggestions.map((sug, i) => (
                              <button
                                key={i}
                                className="pure-pill"
                                onClick={() => sendMessage(sug)}
                                disabled={loading}
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
            {loading && (
              <div className="pure-message-row ai">
                <div className="pure-avatar">
                  <div className="ai-orb-small pulse"></div>
                </div>
                <div className="pure-message-content">
                  <div className="typing-indicator">Processing...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="bottom-input-container">{renderInputBox()}</div>
        </div>
      )}
    </div>
  );
}
