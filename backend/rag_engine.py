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
import numpy as np


class RAGEngine:
    """
    Core Retrieval-Augmented Generation engine.
    
    Architecture:
      - Embedding model: all-MiniLM-L6-v2 (fast, accurate, 384-dim)
      - Vector store: ChromaDB (persistent, local SQLite backend)
      - Chunking: Sliding window with overlap for context preservation
      - Retrieval: Cosine similarity with subject-level filtering
    """

    CHUNK_SIZE = 400      # tokens approx (words)
    CHUNK_OVERLAP = 80    # words of overlap between chunks
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"

    def __init__(self, persist_dir: str = "./chroma_store"):
        print("[RAG] Initializing ChromaDB...")
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(name="syllabus_docs")

        print(f"[RAG] Loading embedding model: {self.EMBEDDING_MODEL}")
        self.embedder = SentenceTransformer(self.EMBEDDING_MODEL)
        print("[RAG] Ready.")

        # In-memory doc registry
        self._doc_registry: Dict[str, Dict] = {}

    # ─── Document Management ─────────────────────────────────────────────────

    def add_document(self, text: str, metadata: Dict[str, Any]) -> str:
        """Chunk, embed, and store a document. Returns doc_id."""
        doc_id = str(uuid.uuid4())[:8]
        chunks = self._chunk_text(text)

        print(f"[RAG] Indexing doc {doc_id}: {len(chunks)} chunks from '{metadata.get('filename', '?')}'")

        embeddings = self.embedder.encode(chunks, batch_size=32, show_progress_bar=False).tolist()

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

        query_embedding = self.embedder.encode([query])[0].tolist()

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
                # Convert cosine distance to similarity score
                score = 1.0 - dist
                if score > 0.25:  # Relevance threshold
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
