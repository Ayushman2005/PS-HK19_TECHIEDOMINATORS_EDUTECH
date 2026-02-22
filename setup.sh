#!/bin/bash
# StudyAI — Full Stack Setup Script
# Run this from the project root: bash setup.sh

set -e
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   StudyAI Setup — Full Stack         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[1/4] Setting up Python backend..."
cd backend

python3 -m venv venv 2>/dev/null || true
source venv/bin/activate

pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "[2/4] Seeding sample syllabus into RAG..."
python3 - <<'EOF'
import sys
sys.path.insert(0, '.')
from rag_engine import RAGEngine
import os

rag = RAGEngine()
with open("sample_syllabus.txt") as f:
    text = f.read()

doc_id = rag.add_document(text, {
    "filename": "sample_syllabus.txt",
    "subject": "Physics & Math",
    "uploaded_at": "2024-01-01"
})
print(f"  ✅ Seeded sample syllabus (doc_id: {doc_id})")
EOF

cd ..

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[3/4] Setting up React frontend..."
cd frontend

if [ ! -f package.json ]; then
  npm create vite@latest . -- --template react --yes 2>/dev/null || true
fi

npm install --silent

cd ..

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && source venv/bin/activate"
echo "    export ANTHROPIC_API_KEY='your-key-here'"
echo "    uvicorn main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Open: http://localhost:5173"
echo ""
