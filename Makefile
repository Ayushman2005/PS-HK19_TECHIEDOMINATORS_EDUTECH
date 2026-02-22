# StudyAI Makefile — convenient dev commands
# Usage: make <target>

.PHONY: setup backend frontend seed test clean help

# ── Setup ──────────────────────────────────────────────────────────────────────
setup:
	@echo "Setting up StudyAI..."
	@bash setup.sh

# ── Backend ────────────────────────────────────────────────────────────────────
backend:
	@echo "Starting backend on http://localhost:8000"
	@cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000 --host 0.0.0.0

backend-install:
	@cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

seed:
	@echo "Seeding sample syllabus..."
	@cd backend && source venv/bin/activate && python seed.py

# ── Frontend ───────────────────────────────────────────────────────────────────
frontend:
	@echo "Starting frontend on http://localhost:5173"
	@cd frontend && npm run dev

frontend-install:
	@cd frontend && npm install

frontend-build:
	@cd frontend && npm run build

# ── Testing ────────────────────────────────────────────────────────────────────
test:
	@echo "Running backend tests..."
	@cd backend && source venv/bin/activate && pytest tests/ -v

# ── Utilities ──────────────────────────────────────────────────────────────────
clean:
	@echo "Cleaning generated files..."
	@rm -rf backend/chroma_store backend/studyai_memory.db backend/studyai_insights.db
	@rm -rf backend/__pycache__ backend/.pytest_cache
	@rm -rf frontend/node_modules frontend/dist
	@echo "Done."

api-docs:
	@echo "Opening API docs..."
	@open http://localhost:8000/docs 2>/dev/null || xdg-open http://localhost:8000/docs

# ── Help ───────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "StudyAI — Available Commands"
	@echo "══════════════════════════════"
	@echo "  make setup          — Full project setup (venv + npm install + seed)"
	@echo "  make backend        — Start FastAPI backend (port 8000)"
	@echo "  make frontend       — Start Vite dev server (port 5173)"
	@echo "  make seed           — Index sample syllabus into ChromaDB"
	@echo "  make test           — Run backend unit tests"
	@echo "  make clean          — Remove generated databases and build files"
	@echo "  make api-docs       — Open FastAPI Swagger UI"
	@echo ""
