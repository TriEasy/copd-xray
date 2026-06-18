import os
import chromadb
from sentence_transformers import SentenceTransformer
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FALLBACK = "Clinical guidance unavailable. Please consult relevant medical guidelines."

_rag_client     = chromadb.PersistentClient(path=os.path.join(BASE, "gold_db"))
_rag_collection = _rag_client.get_or_create_collection("gold_guidelines")
_embed_model    = SentenceTransformer("all-MiniLM-L6-v2")
_openai_client  = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def query_rag(
    question: str,
    k: int = 3,
    max_tokens: int = 300,
    system_prompt: str = (
        "You are a clinical assistant helping doctors understand COPD management. "
        "Answer using ONLY the context provided. "
        "If the answer is not in the context, say 'This is not covered in the provided guidelines.' "
        "Be clear and under 150 words."
    ),
    patient_context: str = "",
) -> tuple:
    """Returns (answer, chunks_used). Raises on failure — caller handles fallback."""
    question_vector = _embed_model.encode(question).tolist()
    results = _rag_collection.query(query_embeddings=[question_vector], n_results=k)
    chunks  = results["documents"][0]
    context = "\n\n".join(chunks)

    user_content = ""
    if patient_context:
        user_content += f"Patient Data:\n{patient_context}\n\n"
    user_content += f"Context from GOLD Guidelines:\n{context}\n\nQuestion: {question}"

    response = _openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_content},
        ],
        max_tokens=max_tokens,
    )

    answer = response.choices[0].message.content.strip()
    return answer, chunks
