---
title: COPD Vision
emoji: 🫁
colorFrom: blue
colorTo: teal
sdk: docker
app_port: 7860
pinned: false
---

# COPD Vision

AI-assisted clinical decision support for COPD diagnosis from chest X-rays.

## What It Does

- Classifies chest X-rays into **Emphysema**, **Normal**, or **Other** using a fine-tuned DenseNet-121
- Generates **Grad-CAM heatmaps** showing which regions the model focused on
- Predicts **COPD severity** from clinical measurements (FEV1, FVC, CAT score, etc.)
- Answers clinical questions using **RAG** (retrieval-augmented generation) over GOLD guidelines
- Produces a downloadable **PDF diagnostic report** with patient info, images, and clinical guidance

## Project Structure

```
copd-xray/
├── configs/
│   └── config.yaml               # Hyperparameters and paths
├── notebooks/
│   ├── exploration.ipynb         # Data exploration
│   ├── copd_cnn.ipynb            # Simple CNN training
│   ├── copd_resnet50.ipynb       # ResNet-50 training
│   ├── copd_efficientnet.ipynb   # EfficientNet-B2 training
│   ├── copd_densenet121.ipynb    # DenseNet-121 training (primary model)
│   └── copd_gradcam.ipynb        # Grad-CAM visualization
├── saved_models/
│   ├── best_model.pth            # Trained DenseNet-121 weights (not tracked by git)
│   └── copd_severity_model.pkl   # Trained severity classifier (not tracked by git)
├── src/
│   └── app.py                    # FastAPI application
├── .env.example                  # Required environment variables
├── .gitignore
└── requirements.txt
```

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/TriEasy/copd-xray.git
cd copd-xray
```

### 2. Create a virtual environment and install dependencies

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Add trained model files

Place the following files in `saved_models/`:

- `best_model.pth` — DenseNet-121 weights (train using `notebooks/copd_densenet121.ipynb`)
- `copd_severity_model.pkl` — severity classifier (train using the severity notebook)

### 5. Run the API

```bash
uvicorn src.app:app --reload
```

Open your browser at `http://localhost:8000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Web UI |
| POST | `/predict` | Classify a chest X-ray image |
| POST | `/gradcam` | Generate Grad-CAM heatmap |
| POST | `/report` | Download PDF diagnostic report |
| POST | `/rag/ask` | Ask a clinical question (RAG) |
| POST | `/severity/predict` | Predict COPD severity from clinical features |

Interactive API docs available at `http://localhost:8000/docs`.

## Training the Models

Open the notebooks in order:

1. `notebooks/exploration.ipynb` — understand the dataset
2. `notebooks/copd_densenet121.ipynb` — train the primary classification model
3. `notebooks/copd_gradcam.ipynb` — verify Grad-CAM on sample images

## Disclaimer

This tool is intended as clinical decision support only. It does not constitute a final diagnosis or treatment order. All outputs must be reviewed by a qualified clinician.
