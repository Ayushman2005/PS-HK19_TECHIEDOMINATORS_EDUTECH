"""
Conversation Memory Manager
Handles multi-turn dialogue history using SQLite for lightweight persistence.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional
import os


DB_PATH = "./studyai_memory.db"


class ConversationMemory:
    """
    Lightweight SQLite-backed conversation memory.
    Tracks multi-turn dialogue per session, avoids repeat explanations,
    and provides structured history for context injection.
    """

    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                student_name TEXT,
                subject TEXT,
                created_at TEXT
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS turns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                question TEXT,
                answer TEXT,
                turn_type TEXT,
                topic TEXT,
                timestamp TEXT,
                FOREIGN KEY(session_id) REFERENCES sessions(session_id)
            )
        """)
        self.conn.commit()

    def init_session(self, session_id: str, student_name: str, subject: Optional[str]):
        self.conn.execute(
            "INSERT OR REPLACE INTO sessions VALUES (?, ?, ?, ?)",
            (session_id, student_name, subject, datetime.utcnow().isoformat())
        )
        self.conn.commit()

    def get_session(self, session_id: str) -> Optional[Dict]:
        row = self.conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        if not row:
            return None
        return {"session_id": row[0], "student_name": row[1], "subject": row[2], "created_at": row[3]}

    def add_turn(self, session_id: str, question: str, answer: str, turn_type: str = "answered"):
        topic = self._extract_topic(question)
        self.conn.execute(
            "INSERT INTO turns (session_id, question, answer, turn_type, topic, timestamp) VALUES (?,?,?,?,?,?)",
            (session_id, question, answer, turn_type, topic, datetime.utcnow().isoformat())
        )
        self.conn.commit()

    def get_history(self, session_id: str, last_n: int = 10) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT question, answer, turn_type, topic, timestamp FROM turns WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, last_n)
        ).fetchall()
        rows.reverse()
        return [
            {"question": r[0], "answer": r[1], "type": r[2], "topic": r[3], "timestamp": r[4]}
            for r in rows
        ]

    def get_session_count(self) -> int:
        row = self.conn.execute("SELECT COUNT(*) FROM sessions").fetchone()
        return row[0] if row else 0

    def _extract_topic(self, question: str) -> str:
        """Simple keyword extraction for topic labeling."""
        stop_words = {"what", "is", "are", "how", "why", "can", "does", "the", "a", "an", "explain", "define", "tell", "me", "about", "do", "please"}
        words = [w.lower() for w in question.split() if w.lower() not in stop_words and len(w) > 3]
        return " ".join(words[:3]) if words else "general"
