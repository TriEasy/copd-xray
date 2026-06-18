"""
Run this once to populate the ChromaDB vector database from the GOLD-2025 guidelines PDF.

Usage (from the copd-xray/ directory):
    python scripts/seed_gold_db.py
"""

import os
import sys
import chromadb
import PyPDF2
from sentence_transformers import SentenceTransformer

BASE       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATH   = os.path.join(BASE, "data", "GOLD-2025.pdf")
DB_PATH    = os.path.join(BASE, "gold_db")
COLLECTION = "gold_guidelines"
CHUNK_SIZE = 500
OVERLAP    = 50


def load_pdf(path: str) -> str:
    text = ""
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
    print(f"Extracted {len(text):,} characters from PDF")
    return text


def split_into_chunks(text: str) -> list[str]:
    chunks = []
    start  = 0
    while start < len(text):
        chunks.append(text[start : start + CHUNK_SIZE])
        start += CHUNK_SIZE - OVERLAP
    print(f"Created {len(chunks):,} chunks (size={CHUNK_SIZE}, overlap={OVERLAP})")
    return chunks


def seed(chunks: list[str]):
    print("Connecting to ChromaDB...")
    client     = chromadb.PersistentClient(path=DB_PATH)
    collection = client.get_or_create_collection(
        name=COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    if collection.count() > 0:
        print(f"Collection already has {collection.count():,} chunks — skipping.")
        return

    print("Loading embedding model (all-MiniLM-L6-v2)...")
    model      = SentenceTransformer("all-MiniLM-L6-v2")

    print("Embedding chunks — this takes about 1 minute...")
    embeddings = model.encode(chunks, show_progress_bar=True).tolist()

    collection.add(
        documents  = chunks,
        embeddings = embeddings,
        ids        = [f"chunk_{i}" for i in range(len(chunks))],
    )
    print(f"Done — stored {collection.count():,} chunks in {DB_PATH}")


if __name__ == "__main__":
    if not os.path.exists(PDF_PATH):
        print(f"ERROR: PDF not found at {PDF_PATH}")
        sys.exit(1)

    text   = load_pdf(PDF_PATH)
    chunks = split_into_chunks(text)
    seed(chunks)
