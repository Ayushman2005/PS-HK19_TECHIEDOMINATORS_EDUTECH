"""
Insight Tracker
Tracks frequently asked topics, confusion reports, and learning history.
Uses SQLite for persistence.
"""

import sqlite3
from datetime import datetime
from typing import List, Dict
from collections import Counter
import json

DB_PATH = "./studyai_insights.db"


class InsightTracker:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                question TEXT,
                subject TEXT,
                keywords TEXT,
                timestamp TEXT
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS confusion_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                topic TEXT,
                confusion_level INTEGER,
                timestamp TEXT
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                filename TEXT,
                subject TEXT,
                added_at TEXT
            )
        """)
        self.conn.commit()

    def record_question(self, session_id: str, question: str, subject: str = None):
        keywords = self._extract_keywords(question)
        self.conn.execute(
            "INSERT INTO questions (session_id, question, subject, keywords, timestamp) VALUES (?,?,?,?,?)",
            (session_id, question, subject or "General", json.dumps(keywords), datetime.utcnow().isoformat())
        )
        self.conn.commit()

    def report_confusion(self, session_id: str, topic: str, level: int):
        self.conn.execute(
            "INSERT INTO confusion_reports (session_id, topic, confusion_level, timestamp) VALUES (?,?,?,?)",
            (session_id, topic, level, datetime.utcnow().isoformat())
        )
        self.conn.commit()

    def add_document(self, doc_id: str, filename: str, subject: str):
        self.conn.execute(
            "INSERT OR REPLACE INTO documents VALUES (?,?,?,?)",
            (doc_id, filename, subject, datetime.utcnow().isoformat())
        )
        self.conn.commit()

    def get_frequent_topics(self, session_id: str) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT keywords FROM questions WHERE session_id = ?", (session_id,)
        ).fetchall()
        all_keywords = []
        for row in rows:
            all_keywords.extend(json.loads(row[0]))
        counts = Counter(all_keywords).most_common(8)
        return [{"topic": k, "count": v} for k, v in counts]

    def get_confusion_areas(self, session_id: str) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT topic, AVG(confusion_level), COUNT(*) FROM confusion_reports WHERE session_id = ? GROUP BY topic ORDER BY AVG(confusion_level) DESC",
            (session_id,)
        ).fetchall()
        return [{"topic": r[0], "avg_confusion": round(r[1], 1), "reports": r[2]} for r in rows]

    def get_question_count(self, session_id: str) -> int:
        row = self.conn.execute(
            "SELECT COUNT(*) FROM questions WHERE session_id = ?", (session_id,)
        ).fetchone()
        return row[0] if row else 0

    def get_subjects(self, session_id: str) -> List[str]:
        rows = self.conn.execute(
            "SELECT DISTINCT subject FROM questions WHERE session_id = ?", (session_id,)
        ).fetchall()
        return [r[0] for r in rows if r[0]]

    def get_global_top_topics(self) -> List[Dict]:
        rows = self.conn.execute("SELECT keywords FROM questions").fetchall()
        all_keywords = []
        for row in rows:
            all_keywords.extend(json.loads(row[0]))
        counts = Counter(all_keywords).most_common(10)
        return [{"topic": k, "count": v} for k, v in counts]

    def _extract_keywords(self, question: str) -> List[str]:
        stop_words = {"what","is","are","how","why","can","does","the","a","an","explain",
                     "define","tell","me","about","do","please","give","show","describe",
                     "and","or","to","of","in","on","at","for","with","this","that","it"}
        words = [w.strip("?.,!").lower() for w in question.split()]
        return [w for w in words if w not in stop_words and len(w) > 3][:5]
