"""
seed.py — Seeds the RAG knowledge base with sample syllabus content.
Run once after setup: python seed.py
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from rag_engine import RAGEngine

SAMPLE_FILES = [
    {
        "path": "sample_syllabus.txt",
        "subject": "Physics & Mathematics",
        "description": "Class 11-12 Physics + Math syllabus"
    }
]


def seed():
    print("\n🌱 StudyAI — Seeding Knowledge Base")
    print("=" * 40)

    rag = RAGEngine()

    for item in SAMPLE_FILES:
        path = os.path.join(os.path.dirname(__file__), item["path"])
        if not os.path.exists(path):
            print(f"  ⚠️  File not found: {path}")
            continue

        with open(path, "r", encoding="utf-8") as f:
            text = f.read()

        print(f"\n  📄 Indexing: {item['description']}")
        doc_id = rag.add_document(text, metadata={
            "filename": os.path.basename(path),
            "subject": item["subject"],
            "uploaded_at": datetime.utcnow().isoformat()
        })
        print(f"  ✅ Indexed as doc_id={doc_id}")

    print(f"\n  Total chunks in store: {rag.collection.count()}")
    print("\n✦ Seeding complete! Start the server and ask questions.\n")


if __name__ == "__main__":
    seed()
