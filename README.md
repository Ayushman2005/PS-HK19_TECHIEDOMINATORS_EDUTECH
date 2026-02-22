
# ✦ StudyAI — Syllabus-Aware AI Doubt Resolution System

A production-ready, full-stack AI learning assistant that answers student questions **exclusively from uploaded syllabus material**, preventing hallucinations and ensuring syllabus alignment.

---

## 🏗 Architecture

```bash
┌─────────────────────────────────────────────────────────────────────┐
│                        StudyAI Architecture                         │
├──────────────────────────┬──────────────────────────────────────────┤
│  React Frontend          │  Python FastAPI Backend                  │
│  ─────────────────       │  ───────────────────────                 │
│  • Chat Interface        │  • RAG Engine (ChromaDB)                 │
│  • Upload Panel          │  • Sentence Transformers                 │
│  • Insights Dashboard    │  • Conversation Memory (SQLite)          │
│  • Adaptive Mode Toggle  │  • Insight Tracker (SQLite)              │
│  • Confusion Reporter    │  • Anthropic Claude API                  │
└──────────────────────────┴──────────────────────────────────────────┘
```

### RAG Pipeline

```bash
User Question
     │
     ▼
Semantic Embedding (all-MiniLM-L6-v2, 384-dim)
     │
     ▼
ChromaDB Vector Search (cosine similarity, top-5 chunks)
     │
     ▼
Relevance Filtering (threshold: 0.25 cosine similarity)
     │
     ├── No relevant chunks found → "Out of syllabus" response
     │
     ▼
Context Assembly + Conversation History Injection
     │
     ▼
Adaptive Prompt Construction
  • Student level: beginner / intermediate / advanced
  • Mode: quick / step-by-step / example-based
  • Vague question detection → clarification request
     │
     ▼
Claude claude-sonnet-4-20250514 API Call
     │
     ▼
Response + Source Attribution + Confidence Score
```

---

## 📁 Project Structure

```bash
studyai/
├── backend/
│   ├── main.py              # FastAPI app, all routes
│   ├── rag_engine.py        # ChromaDB + Sentence Transformer RAG
│   ├── memory_manager.py    # SQLite multi-turn conversation memory
│   ├── insight_tracker.py   # SQLite analytics + confusion tracking
│   ├── ai_client.py         # Anthropic API wrapper
│   ├── sample_syllabus.txt  # Demo content (Physics + Math)
│   └── requirements.txt
├── frontend/
│   └── src/
│       └── App.jsx          # Complete React application (single file)
├── setup.sh                 # One-command setup
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Anthropic API Key

### 1. Setup (one command)
```bash
bash setup.sh
```

### 2. Start Backend
```bash
cd backend
source venv/bin/activate
export ANTHROPIC_API_KEY="sk-ant-..."
uvicorn main:app --reload --port 8000
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

### 4. Open App
```bash
http://localhost:5173
```

---

## ✨ Features

### Core RAG Engine
| Feature | Implementation |
|---|---|
| Embedding Model | `sentence-transformers/all-MiniLM-L6-v2` (384-dim) |
| Vector Store | ChromaDB with persistent SQLite backend |
| Chunking | Sliding window (400 words, 80-word overlap, sentence-boundary aware) |
| Retrieval | Top-5 cosine similarity, threshold 0.25 |
| Subject Filtering | Per-query metadata filter on ChromaDB |
| PDF Support | `pypdf` extraction |

### Hallucination Prevention
- **Source-grounded only**: If no relevant chunk found → explicit "out of syllabus" message, no generation
- **Confidence scoring**: Based on avg retrieval similarity score (0–100%)
- **Source attribution**: Every answer shows which file it came from

### Adaptive Explanation Engine
- **Beginner**: Simple language, everyday analogies, no jargon
- **Intermediate**: Standard academic language with examples
- **Advanced**: Concise, technical notation, dense
- **Quick mode**: 2-3 sentence direct answer
- **Step-by-step**: Numbered reasoning chain
- **Example-based**: Lead with concrete example/analogy

### Conversational Memory
- SQLite-persisted per session
- Last 6 turns injected into every prompt
- Topic extraction from questions
- Prevents redundant explanations

### Vague Question Handling
- Length heuristic + trigger word detection
- Asks focused clarifying questions referencing prior conversation

### Student Insight Panel
- Frequently asked topics (keyword frequency)
- Self-reported confusion (1–5 scale, per topic)
- Full learning history with timestamps and turn types
- Session metrics: total questions, subjects covered

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/session/create` | POST | Create student session |
| `/upload?subject=X` | POST | Upload + index PDF/TXT |
| `/ask` | POST | RAG-powered Q&A |
| `/insights/{session_id}` | GET | Student analytics |
| `/confusion` | POST | Report confusion |
| `/documents` | GET | List indexed docs |
| `/documents/{doc_id}` | DELETE | Remove document |
| `/global-insights` | GET | Cross-session analytics |

---

## 🧪 Testing with Sample Content

The `sample_syllabus.txt` includes full content for:
- Newton's Laws of Motion
- Gravitation + Kepler's Laws
- Thermodynamics (all 4 laws)
- Simple Harmonic Motion + Waves
- Electricity & Magnetism
- Calculus (Differentiation + Integration)
- Matrices & Probability

**Try asking:**
- *"Explain Newton's Second Law step by step"*
- *"What is the formula for period of a pendulum?"*
- *"How does Faraday's Law relate to Lenz's Law?"*
- *"Derive the binomial distribution mean"*
- *"What is quantum entanglement?"* ← Will be blocked as out-of-syllabus

---

## 🛠 Configuration

### Backend Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-...          # Required
CHROMA_STORE_PATH=./chroma_store      # Optional, default: ./chroma_store
```

### Tuning the RAG Engine (rag_engine.py)
```python
CHUNK_SIZE = 400        # Words per chunk (increase for longer context)
CHUNK_OVERLAP = 80      # Overlap words between chunks
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Can use larger models for better recall
# Retrieval threshold: 0.25 (lower = more permissive, higher = stricter)
```
