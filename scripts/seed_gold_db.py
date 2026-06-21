"""
Run this once to populate the ChromaDB vector database from all PDFs in data/.

Usage (from the copd-xray/ directory):
    python scripts/seed_gold_db.py
"""

import os
import re
import sys
import chromadb
import PyPDF2
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

BASE       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(BASE, "data")   # all PDFs here are loaded
DB_PATH    = os.path.join(BASE, "gold_db")
COLLECTION = "gold_guidelines"
EMBED_MODEL          = "text-embedding-3-small"
SIMILARITY_THRESHOLD = 0.75  # split when cosine similarity drops below this

_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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


def embed(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts using OpenAI text-embedding-3-small."""
    # OpenAI API accepts max 2048 inputs per call — batch if needed
    all_vectors = []
    batch_size  = 500
    for i in range(0, len(texts), batch_size):
        batch    = texts[i : i + batch_size]
        response = _openai.embeddings.create(model=EMBED_MODEL, input=batch)
        all_vectors += [item.embedding for item in response.data]
        print(f"  Embedded {min(i + batch_size, len(texts))}/{len(texts)}")
    return all_vectors


def cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10)


def split_into_chunks(text: str) -> list[str]:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n{2,}", text) if s.strip()]
    print(f"Embedding {len(sentences):,} sentences for semantic splitting...")

    embeddings = embed(sentences)

    chunks  = []
    current = [sentences[0]]

    for i in range(1, len(sentences)):
        sim = cosine_sim(embeddings[i - 1], embeddings[i])
        if sim < SIMILARITY_THRESHOLD:
            chunks.append(" ".join(current))
            current = [sentences[i]]
        else:
            current.append(sentences[i])

    if current:
        chunks.append(" ".join(current))

    print(f"Created {len(chunks):,} semantic chunks (threshold={SIMILARITY_THRESHOLD})")
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

    print(f"Embedding {len(chunks):,} chunks with OpenAI {EMBED_MODEL}...")
    embeddings = embed(chunks)

    batch_size = 5000
    for i in range(0, len(chunks), batch_size):
        collection.add(
            documents  = chunks[i : i + batch_size],
            embeddings = embeddings[i : i + batch_size],
            ids        = [f"chunk_{j}" for j in range(i, min(i + batch_size, len(chunks)))],
        )
        print(f"  Stored {min(i + batch_size, len(chunks))}/{len(chunks)} chunks")
    print(f"Done — stored {collection.count():,} chunks in {DB_PATH}")


if __name__ == "__main__":
    pdf_files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print(f"ERROR: No PDF files found in {DATA_DIR}")
        sys.exit(1)

    print(f"Found {len(pdf_files)} PDF(s): {pdf_files}")

    all_chunks = []
    for pdf_file in pdf_files:
        print(f"\n── Loading: {pdf_file} ──")
        text = load_pdf(os.path.join(DATA_DIR, pdf_file))
        if not text.strip():
            print(f"  SKIPPED — no text found (scanned/image PDF)")
            continue
        chunks = split_into_chunks(text)
        all_chunks.extend(chunks)

    print(f"\nTotal chunks from all PDFs: {len(all_chunks):,}")
    seed(all_chunks)
