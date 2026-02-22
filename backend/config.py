"""
config.py — Centralized configuration for StudyAI backend
All environment variables and constants live here.
"""

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Config:
    # ── API Keys ──────────────────────────────────────────────────────────────
    gemini_api_key: str = field(
        default_factory=lambda: os.environ.get("GEMINI_API_KEY", "")
    )

    # ── AI Model ──────────────────────────────────────────────────────────────
    gemini_model: str = "gemini-2.5-flash"
    max_tokens: int = 1500

    # ── RAG ───────────────────────────────────────────────────────────────────
    chroma_persist_dir: str = os.environ.get("CHROMA_STORE_PATH", "./chroma_store")
    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = 400          # words
    chunk_overlap: int = 80        # words
    retrieval_top_k: int = 5
    retrieval_threshold: float = 0.25   # cosine similarity minimum

    # ── Memory ────────────────────────────────────────────────────────────────
    memory_db_path: str = "./studyai_memory.db"
    memory_history_window: int = 6      # turns to inject into prompt

    # ── Insights ──────────────────────────────────────────────────────────────
    insights_db_path: str = "./studyai_insights.db"

    # ── Upload ────────────────────────────────────────────────────────────────
    max_upload_size_mb: int = 50
    allowed_extensions: tuple = (".pdf", ".txt", ".md")

    # ── Server ────────────────────────────────────────────────────────────────
    host: str = os.environ.get("HOST", "0.0.0.0")
    port: int = int(os.environ.get("PORT", 8000))
    cors_origins: list = field(
        default_factory=lambda: os.environ.get("CORS_ORIGINS", "*").split(",")
    )

    def validate(self):
        if not self.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not set. "
                "Run: export GEMINI_API_KEY='AIzaSy...'"
            )
        return self


# Singleton instance
settings = Config()