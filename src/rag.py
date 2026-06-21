import os
import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FALLBACK     = "Clinical guidance unavailable. Please consult relevant medical guidelines."
EMBED_MODEL  = "text-embedding-3-small"

_rag_client     = chromadb.PersistentClient(path=os.path.join(BASE, "gold_db"))
_rag_collection = _rag_client.get_or_create_collection("gold_guidelines")
_openai_client  = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _contextualize_question(question: str, history: list) -> str:
    """Rewrite a vague follow-up into a standalone searchable question."""
    if not history:
        return question

    history_text = "\n".join(
        f"{m['role'].capitalize()}: {m['content']}" for m in history[-6:]
    )
    prompt = (
        "Given the conversation history below and a follow-up question, "
        "rewrite the follow-up as a complete standalone question that can be "
        "understood without the history. Return ONLY the rewritten question.\n\n"
        f"History:\n{history_text}\n\n"
        f"Follow-up: {question}\n\n"
        "Standalone question:"
    )
    response = _openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=80,
    )
    return response.choices[0].message.content.strip()


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
    history: list = [],
) -> tuple:
    """Returns (answer, chunks_used). Raises on failure — caller handles fallback."""
    # Rewrite vague follow-ups ("tell me more") into standalone questions
    search_question = _contextualize_question(question, history)

    question_vector = _openai_client.embeddings.create(
        model=EMBED_MODEL, input=search_question
    ).data[0].embedding
    results = _rag_collection.query(query_embeddings=[question_vector], n_results=k)
    chunks  = results["documents"][0]
    context = "\n\n".join(chunks)

    user_content = ""
    if patient_context:
        user_content += f"Patient Data:\n{patient_context}\n\n"
    user_content += f"Context from GOLD Guidelines:\n{context}\n\nQuestion: {question}"

    # Build messages: system → last 6 history turns → current question
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_content})

    response = _openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=max_tokens,
    )

    answer = response.choices[0].message.content.strip()
    return answer, chunks
