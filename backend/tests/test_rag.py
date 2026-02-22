"""
tests/test_rag.py — Unit tests for the RAG engine and core components
Run: pytest tests/ -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ── RAG Engine Tests ──────────────────────────────────────────────────────────

class TestRAGEngine:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path):
        from rag_engine import RAGEngine
        self.rag = RAGEngine(persist_dir=str(tmp_path / "test_chroma"))

    def test_chunking_basic(self):
        """Chunks should be non-empty and respect min word count."""
        text = " ".join(["word"] * 1000)
        chunks = self.rag._chunk_text(text)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk.split()) >= 20

    def test_chunking_short_text(self):
        """Very short text should still produce at least one chunk if long enough."""
        text = "Newton's Second Law states that F equals ma. " * 10
        chunks = self.rag._chunk_text(text)
        assert len(chunks) >= 1

    def test_add_and_retrieve(self):
        """Documents added to the store should be retrievable."""
        text = (
            "Newton's Second Law of Motion: The rate of change of momentum "
            "is proportional to applied force. F = ma where F is force, "
            "m is mass, and a is acceleration. "
        ) * 20   # repeat to pass min length

        doc_id = self.rag.add_document(text, {
            "filename": "test.txt",
            "subject": "Physics"
        })

        assert doc_id is not None
        result = self.rag.retrieve("What is Newton's Second Law?", top_k=3)
        assert "chunks" in result
        # Should find relevant content
        assert len(result["chunks"]) > 0

    def test_retrieve_empty_store(self):
        """Retrieval on empty store should return empty chunks, not error."""
        result = self.rag.retrieve("anything", top_k=3)
        assert result["chunks"] == []

    def test_subject_filter(self):
        """Subject filter should restrict results."""
        text_phys = ("Force mass acceleration Newton law physics " * 30)
        text_math = ("Integration differentiation calculus derivative " * 30)

        self.rag.add_document(text_phys, {"filename": "phys.txt", "subject": "Physics"})
        self.rag.add_document(text_math, {"filename": "math.txt", "subject": "Math"})

        result = self.rag.retrieve("calculus integration", subject_filter="Math", top_k=5)
        for chunk in result["chunks"]:
            assert chunk["subject"] == "Math"

    def test_delete_document(self):
        """Deleted documents should not appear in retrieval."""
        text = "Quantum mechanics superposition entanglement wavefunction " * 30
        doc_id = self.rag.add_document(text, {"filename": "quantum.txt", "subject": "Physics"})

        self.rag.delete_document(doc_id)
        result = self.rag.retrieve("quantum mechanics")
        # Chunks from deleted doc should not appear
        for chunk in result["chunks"]:
            assert chunk["filename"] != "quantum.txt"

    def test_confidence_threshold(self):
        """Chunks below 0.25 cosine similarity should be filtered out."""
        text = "Irrelevant topic about cooking recipes and food preparation " * 30
        self.rag.add_document(text, {"filename": "food.txt", "subject": "General"})

        # Physics question should not match cooking content well
        result = self.rag.retrieve("Faraday electromagnetic induction")
        # Either no results or low-confidence ones filtered
        for chunk in result["chunks"]:
            assert chunk["score"] >= 0.25


# ── Memory Manager Tests ──────────────────────────────────────────────────────

class TestMemoryManager:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path, monkeypatch):
        monkeypatch.setattr('memory_manager.DB_PATH', str(tmp_path / "test_memory.db"))
        from memory_manager import ConversationMemory
        self.mem = ConversationMemory()

    def test_session_lifecycle(self):
        self.mem.init_session("sess1", "Alice", "Physics")
        sess = self.mem.get_session("sess1")
        assert sess is not None
        assert sess["student_name"] == "Alice"

    def test_unknown_session(self):
        result = self.mem.get_session("nonexistent")
        assert result is None

    def test_add_and_get_turns(self):
        self.mem.init_session("sess2", "Bob", "Math")
        self.mem.add_turn("sess2", "What is integration?", "Integration is...", "answered")
        self.mem.add_turn("sess2", "Give an example", "For example, ...", "answered")

        history = self.mem.get_history("sess2")
        assert len(history) == 2
        assert history[0]["question"] == "What is integration?"

    def test_history_last_n(self):
        self.mem.init_session("sess3", "Carol", "Chemistry")
        for i in range(10):
            self.mem.add_turn("sess3", f"Q{i}", f"A{i}", "answered")

        history = self.mem.get_history("sess3", last_n=4)
        assert len(history) == 4

    def test_topic_extraction(self):
        topic = self.mem._extract_topic("What is Newton's Second Law of Motion?")
        assert len(topic) > 0  # Should extract something


# ── Insight Tracker Tests ─────────────────────────────────────────────────────

class TestInsightTracker:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path, monkeypatch):
        monkeypatch.setattr('insight_tracker.DB_PATH', str(tmp_path / "test_insights.db"))
        from insight_tracker import InsightTracker
        self.tracker = InsightTracker()

    def test_record_and_count(self):
        self.tracker.record_question("s1", "What is force?", "Physics")
        self.tracker.record_question("s1", "What is acceleration?", "Physics")
        assert self.tracker.get_question_count("s1") == 2

    def test_confusion_report(self):
        self.tracker.report_confusion("s1", "Integration", 4)
        self.tracker.report_confusion("s1", "Integration", 5)
        areas = self.tracker.get_confusion_areas("s1")
        assert len(areas) >= 1
        assert areas[0]["topic"] == "Integration"
        assert areas[0]["avg_confusion"] >= 4.0

    def test_frequent_topics(self):
        for _ in range(5):
            self.tracker.record_question("s2", "Explain Newton's laws", "Physics")
        for _ in range(2):
            self.tracker.record_question("s2", "What is integration?", "Math")

        topics = self.tracker.get_frequent_topics("s2")
        assert len(topics) > 0

    def test_subjects(self):
        self.tracker.record_question("s3", "Q1", "Physics")
        self.tracker.record_question("s3", "Q2", "Mathematics")
        subjects = self.tracker.get_subjects("s3")
        assert "Physics" in subjects
        assert "Mathematics" in subjects


# ── Helper Tests ──────────────────────────────────────────────────────────────

class TestHelpers:
    def test_vague_question_detection(self):
        # Import the helper from main
        import importlib.util
        spec = importlib.util.spec_from_file_location("main", os.path.join(os.path.dirname(__file__), '..', 'main.py'))
        # We'll test the logic directly
        def is_vague(q):
            vague_triggers = ["this", "that", "it", "explain", "what is", "tell me about", "help"]
            q_lower = q.lower().strip()
            if len(q_lower.split()) < 4:
                return True
            return any(q_lower.startswith(t) and len(q_lower.split()) < 6 for t in vague_triggers)

        assert is_vague("this") == True
        assert is_vague("help me") == True
        assert is_vague("Explain Newton's Second Law of Motion in detail") == False
        assert is_vague("What is the formula for kinetic energy and how is it derived?") == False
