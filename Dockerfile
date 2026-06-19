# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /frontend

COPY frontend-ui-v14/package.json frontend-ui-v14/pnpm-lock.yaml frontend-ui-v14/pnpm-workspace.yaml ./
RUN npm install -g pnpm@11 && pnpm install
COPY frontend-ui-v14/ ./
RUN pnpm build
# output is at /frontend/dist


# ── Stage 2: Python runtime ────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# System dependency for PyTorch (OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY src/ ./src/
COPY saved_models/ ./saved_models/
COPY gold_db/ ./gold_db/

# React build output (served by FastAPI as static files)
COPY --from=frontend-builder /frontend/dist ./frontend-dist

# HF Spaces requires port 7860
EXPOSE 7860

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "7860"]
