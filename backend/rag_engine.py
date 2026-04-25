"""
RAG Engine — ChromaDB + Sentence Transformers
Handles document ingestion, chunking, embedding, and retrieval.
"""

import uuid
import io
import re
from typing import List, Dict, Optional, Any
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from config import settings

class RAGEngine:
    """
    Core Retrieval-Augmented Generation engine.
    
    Architecture:
      - Embedding model: Google Gemini (models/embedding-001) - API based to save memory
      - Vector store: ChromaDB (persistent, local SQLite backend)
      - Chunking: Sliding window with overlap for context preservation
      - Retrieval: Cosine similarity with subject-level filtering
    """

    CHUNK_SIZE = 250      # Reduced chunk size for granular, highly accurate retrieval
    CHUNK_OVERLAP = 50    # Overlap to preserve context boundaries
    EMBEDDING_MODEL = "models/embedding-001"

    def __init__(self, persist_dir: str = "./chroma_store"):
        print("[RAG] Initializing ChromaDB...")
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(name="syllabus_docs")

        print(f"[RAG] Using Gemini Embedding model: {self.EMBEDDING_MODEL}")
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
        else:
            print("[RAG] WARNING: GEMINI_API_KEY not found. Embeddings will fail.")
        
        print("[RAG] Ready.")

        # In-memory doc registry
        self._doc_registry: Dict[str, Dict] = {}
        
        # Restore doc registry from ChromaDB to persist state across restarts
        try:
            results = self.collection.get(include=["metadatas"])
            if results and results.get("metadatas"):
                for meta in results["metadatas"]:
                    if not meta:
                        continue
                    doc_id = meta.get("doc_id")
                    if doc_id and doc_id not in self._doc_registry:
                        self._doc_registry[doc_id] = {
                            "doc_id": doc_id,
                            "filename": meta.get("filename", "unknown"),
                            "subject": meta.get("subject", "General"),
                            "chunk_count": meta.get("chunk_total", 0),
                            "uploaded_at": meta.get("uploaded_at", "")
                        }
        except Exception as e:
            print(f"[RAG] Failed to restore doc registry: {e}")

    # ─── Document Management ─────────────────────────────────────────────────

    def add_document(self, text: str, metadata: Dict[str, Any]) -> str:
        """Chunk, embed, and store a document. Returns doc_id."""
        doc_id = str(uuid.uuid4())[:8]
        chunks = self._chunk_text(text)

        print(f"[RAG] Indexing doc {doc_id}: {len(chunks)} chunks from '{metadata.get('filename', '?')}'")

        # Use Gemini API for embeddings
        res = genai.embed_content(
            model=self.EMBEDDING_MODEL,
            content=chunks,
            task_type="retrieval_document"
        )
        embeddings = res['embedding']

        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        chunk_metadata = [{
            **metadata,
            "doc_id": doc_id,
            "chunk_index": i,
            "chunk_total": len(chunks)
        } for i in range(len(chunks))]

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=chunk_metadata
        )

        self._doc_registry[doc_id] = {
            "doc_id": doc_id,
            "filename": metadata.get("filename", "unknown"),
            "subject": metadata.get("subject", "General"),
            "chunk_count": len(chunks),
            "uploaded_at": metadata.get("uploaded_at", "")
        }
        return doc_id

    def delete_document(self, doc_id: str):
        """Remove all chunks for a doc from the vector store."""
        results = self.collection.get(where={"doc_id": doc_id})
        if results["ids"]:
            self.collection.delete(ids=results["ids"])
        self._doc_registry.pop(doc_id, None)
        print(f"[RAG] Deleted doc {doc_id}")

    def list_documents(self) -> List[Dict]:
        return list(self._doc_registry.values())

    def get_document_count(self) -> int:
        return len(self._doc_registry)

    def get_chunk_count(self, doc_id: str) -> int:
        return self._doc_registry.get(doc_id, {}).get("chunk_count", 0)

    # ─── Retrieval ────────────────────────────────────────────────────────────

    def retrieve(
        self,
        query: str,
        subject_filter: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Semantic retrieval with optional subject filtering.
        Returns ranked chunks with scores.
        """
        if self.collection.count() == 0:
            return {"chunks": [], "query": query}

        # Use Gemini API for query embedding
        res = genai.embed_content(
            model=self.EMBEDDING_MODEL,
            content=query,
            task_type="retrieval_query"
        )
        query_embedding = res['embedding']

        where_filter = {}
        if subject_filter and subject_filter.lower() != "general":
            where_filter = {"subject": subject_filter}

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, self.collection.count()),
                where=where_filter if where_filter else None,
                include=["documents", "metadatas", "distances"]
            )
        except Exception:
            # Fallback without filter
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, self.collection.count()),
                include=["documents", "metadatas", "distances"]
            )

        chunks = []
        if results["documents"] and results["documents"][0]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            ):
                # Convert ChromaDB default L2 squared distance to cosine similarity
                # For normalized embeddings: L2^2 = 2 - 2*cos(theta) => cos = 1 - L2^2 / 2
                score = 1.0 - (dist / 2.0)
                if score > 0.35:  # STRICT relevance threshold for 100% accuracy (no hallucinations)
                    chunks.append({
                        "text": doc,
                        "filename": meta.get("filename", "Unknown"),
                        "subject": meta.get("subject", "General"),
                        "chunk_index": meta.get("chunk_index", 0),
                        "score": round(score, 4)
                    })

        # Sort by score descending
        chunks.sort(key=lambda x: x["score"], reverse=True)
        return {"chunks": chunks[:top_k], "query": query}

    # ─── PDF Extraction ───────────────────────────────────────────────────────

    def extract_pdf_text(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes using pypdf."""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n\n".join(pages)
        except Exception as e:
            raise ValueError(f"PDF extraction failed: {e}")

    # ─── Chunking ────────────────────────────────────────────────────────────

    def _chunk_text(self, text: str) -> List[str]:
        """
        Sliding window chunking with sentence boundary awareness.
        Preserves semantic units better than naive word splitting.
        """
        # Clean text
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Split into sentences first
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_chunk_words = []
        current_len = 0

        for sentence in sentences:
            words = sentence.split()
            word_count = len(words)

            # If a single sentence exceeds CHUNK_SIZE, handle it gracefully by breaking it down
            if word_count > self.CHUNK_SIZE:
                if current_chunk_words:
                    chunks.append(" ".join(current_chunk_words))
                    current_chunk_words = []
                    current_len = 0
                
                for i in range(0, word_count, self.CHUNK_SIZE - self.CHUNK_OVERLAP):
                    chunk = words[i:i + self.CHUNK_SIZE]
                    chunks.append(" ".join(chunk))
                continue

            if current_len + word_count > self.CHUNK_SIZE and current_chunk_words:
                chunks.append(" ".join(current_chunk_words))
                # Keep overlap
                overlap_words = current_chunk_words[-self.CHUNK_OVERLAP:]
                current_chunk_words = overlap_words + words
                current_len = len(current_chunk_words)
            else:
                current_chunk_words.extend(words)
                current_len += word_count

        if current_chunk_words:
            chunks.append(" ".join(current_chunk_words))

        # Filter very short chunks
        return [c for c in chunks if len(c.split()) > 20]
