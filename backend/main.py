from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json
import random

from rag_engine import RAGEngine
from memory_manager import ConversationMemory
from insight_tracker import InsightTracker
from ai_client import AIClient

app = FastAPI(title="StudyAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine = RAGEngine()
memory_manager = ConversationMemory()
insight_tracker = InsightTracker()
ai_client = AIClient()

# ── Pydantic Models ──────────────────────────────────────────────────────────


class AskRequest(BaseModel):
    question: str
    session_id: str
    student_level: str = "intermediate"
    explanation_mode: str = "detailed"
    subject: Optional[str] = None


class QuizRequest(BaseModel):
    session_id: str
    topic: str
    num_questions: int = 3


class ConfusionRequest(BaseModel):
    session_id: str
    topic: str
    confusion_level: int


# ── Helper Functions ─────────────────────────────────────────────────────────


def _build_prompt(
    question, context_chunks, history, level, mode, is_weak_subject=False
):
    level_map = {
        "beginner": "Simple language, analogies, no jargon.",
        "intermediate": "Standard academic terms with examples.",
        "advanced": "Technical, concise, high-level background assumed.",
    }
    mode_map = {
        "quick": "STRICT BREVITY REQUIRED:\n- Provide a maximum of 5 short, one-line bullet points.\n- Do not use introductory filler phrases.\n- Keep it extremely concise.",
        "step-by-step": "Break the answer down into a clear, logical, step-by-step guide or process.",
        "example-based": "Explain the concept using practical, real-world examples and analogies.",
        "quiz": 'Return ONLY a valid JSON array of 3 multiple-choice questions based on the topic. Do not include any markdown formatting, backticks, or intro text. Just the raw JSON.\nFormat exactly like this:\n[\n  {\n    "question": "Question text here?",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "answer": 1,\n    "explanation": "Explanation for why this is correct."\n  }\n]\nThe answer field must be the integer index (0-3) of the correct option.',
    }

    struggle_protocol = ""
    if is_weak_subject:
        struggle_protocol = f"""
🚨 WEAK SUBJECT DETECTED: 
- Use EXTREME BEGINNER analogies.
- Use a Markdown TABLE to compare concepts.
- Include image: ![Infographic](https://image.pollinations.ai/prompt/simple%20educational%20infographic%20of%20{question.replace(' ', '%20')}?nologo=true)
"""

    context = (
        "\n".join([c["text"] for c in context_chunks])
        if context_chunks
        else "Use Web Search."
    )

    return f"""You are StudyAI. Use Syllabus and Google Search.
{struggle_protocol}
LEVEL: {level_map.get(level)} | MODE: {mode_map.get(mode, 'Provide a standard detailed response.')}
SYLLABUS: {context}
QUESTION: {question}
"""


async def _generate_follow_ups(question, answer, client):
    prompt = f'Based on this text: \'{answer[:300]}\', generate 3 highly specific, topic-related follow-up questions. Return ONLY a valid JSON array of strings formatted exactly like this: ["specific question 1?", "specific question 2?", "specific question 3?"]. No markdown formatting.'
    res = await client.complete(prompt)
    try:
        clean = res["text"].strip().replace("```json", "").replace("```", "")
        start = clean.find("[")
        end = clean.rfind("]") + 1
        if start != -1 and end != -1:
            clean = clean[start:end]
        return json.loads(clean)
    except:
        return [
            f"Can you elaborate on {question}?",
            "What is a practical example of this?",
            "How does this connect to related topics?",
        ]


# ── API Endpoints ────────────────────────────────────────────────────────────


@app.post("/session/create")
async def create_session(req: dict):
    session_id = str(random.randint(1000, 9999))
    student_name = req.get("student_name", "Student")
    subject = req.get("subject")
    memory_manager.init_session(session_id, student_name, subject)
    return {"session_id": session_id, "student_name": student_name}


@app.post("/ask")
async def ask_question(req: AskRequest):
    history = memory_manager.get_history(req.session_id)
    topic = memory_manager._extract_topic(req.question)

    # Threshold = 3 questions (2 previous + current)
    topic_count = sum(1 for h in history if h.get("topic") == topic)
    is_weak = topic_count >= 2

    retrieved = rag_engine.retrieve(req.question, subject_filter=req.subject)
    prompt = _build_prompt(
        req.question,
        retrieved["chunks"],
        history,
        req.student_level,
        req.explanation_mode,
        is_weak,
    )

    ai_res = await ai_client.complete(prompt)
    follow_ups = await _generate_follow_ups(req.question, ai_res["text"], ai_client)

    memory_manager.add_turn(req.session_id, req.question, ai_res["text"])
    insight_tracker.record_question(req.session_id, req.question, req.subject)

    return {
        "answer": ai_res["text"],
        "web_sources": ai_res["web_sources"],
        "follow_up_suggestions": follow_ups,
        "is_weak": is_weak,
        "sources": [
            {"filename": c["filename"], "excerpt": c["text"][:150]}
            for c in retrieved["chunks"][:2]
        ],
    }


@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    prompt = f"Create a BASIC {req.num_questions}-question MCQ quiz on {req.topic}. Return ONLY raw JSON: {{'title': '...', 'questions': [{{'questionText': '...', 'options': [], 'correctAnswerIndex': 0, 'explanation': '...'}}]}}"
    res = await ai_client.complete(prompt)
    try:
        clean = res["text"].strip().replace("```json", "").replace("```", "")
        return json.loads(clean)
    except:
        raise HTTPException(status_code=500, detail="Quiz failed")


# ── Knowledge Base Endpoints ─────────────────────────────────────────────────


@app.post("/upload")
async def upload_document(subject: str, file: UploadFile = File(...)):
    try:
        content = await file.read()
        if file.filename.lower().endswith(".pdf"):
            text = rag_engine.extract_pdf_text(content)
        else:
            text = content.decode("utf-8")

        doc_id = rag_engine.add_document(
            text, {"filename": file.filename, "subject": subject}
        )

        insight_tracker.add_document(doc_id, file.filename, subject)
        return {
            "doc_id": doc_id,
            "filename": file.filename,
            "subject": subject,
            "chunk_count": rag_engine.get_chunk_count(doc_id),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/documents")
async def list_documents():
    return {"documents": rag_engine.list_documents()}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    rag_engine.delete_document(doc_id)
    return {"status": "success"}


# ── Insights Endpoints ───────────────────────────────────────────────────────


@app.get("/insights/{session_id}")
async def get_insights(session_id: str):
    return {
        "total_questions": insight_tracker.get_question_count(session_id),
        "frequently_asked": insight_tracker.get_frequent_topics(session_id),
        "subjects_covered": insight_tracker.get_subjects(session_id),
        "confusion_areas": insight_tracker.get_confusion_areas(session_id),
        "learning_history": memory_manager.get_history(session_id),
    }


@app.post("/confusion")
async def report_confusion(req: ConfusionRequest):
    insight_tracker.report_confusion(req.session_id, req.topic, req.confusion_level)
    return {"status": "success"}


@app.get("/global-insights")
async def get_global_insights():
    return {"frequent_topics": insight_tracker.get_global_top_topics()}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
