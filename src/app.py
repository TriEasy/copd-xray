from fastapi import FastAPI, UploadFile, File, Form, Request
from typing import Optional
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fpdf import FPDF
import tempfile, uuid, datetime
from pydantic import BaseModel
from PIL import Image
import io, os, joblib
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import pandas as pd
from dotenv import load_dotenv
from .preprocess import validate_image
from .inference import run_prediction, run_gradcam
from .rag import query_rag, FALLBACK

load_dotenv()

app = FastAPI(title="COPD API", description="Image classification + Severity prediction + RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Severity model setup ───────────────────────────────────────────────────────
severity_model = joblib.load(os.path.join(BASE, "saved_models", "copd_severity_model.pkl"))

SEVERITY_FEATURES = [
    "AGE", "PackHistory", "FEV1", "FEV1PRED", "FVC", "FVCPRED",
    "MWT1Best", "CAT", "HAD", "SGRQ",
    "gender", "smoking", "Diabetes", "muscular",
    "hypertension", "AtrialFib", "IHD"
]

# ── Request models ─────────────────────────────────────────────────────────────
class Question(BaseModel):
    question: str
    k: int = 3
    patient_context: str = ""

class SeverityInput(BaseModel):
    AGE: float
    PackHistory: float
    FEV1: float
    FEV1PRED: float
    FVC: float
    FVCPRED: float
    MWT1Best: float
    CAT: float
    HAD: float
    SGRQ: float
    gender: int
    smoking: int
    Diabetes: int
    muscular: int
    hypertension: int
    AtrialFib: int
    IHD: int


# ── API routes ─────────────────────────────────────────────────────────────────

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_data = await file.read()
    validate_image(file, image_data)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    diagnosis, confidence, all_scores, _ = run_prediction(image)

    return {
        "prediction": diagnosis,
        "confidence": confidence,
        "all_scores": all_scores,
    }


@app.post("/rag/ask")
def rag_ask(body: Question):
    try:
        answer, chunks = query_rag(body.question, k=body.k, patient_context=body.patient_context)
        return {
            "question"   : body.question,
            "answer"     : answer,
            "chunks_used": chunks,
        }
    except Exception as e:
        return {
            "question"   : body.question,
            "answer"     : FALLBACK,
            "chunks_used": [],
            "error"      : str(e),
        }


@app.post("/gradcam")
async def gradcam(file: UploadFile = File(...)):
    image_data = await file.read()
    validate_image(file, image_data)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    diagnosis, confidence, _, input_tensor = run_prediction(image)
    cam_img = run_gradcam(image, input_tensor)

    buf = io.BytesIO()
    cam_img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png", headers={
        "X-Prediction": diagnosis,
        "X-Confidence": str(confidence),
    })


@app.post("/report")
async def generate_report(
    file        : UploadFile = File(...),
    name        : str = Form(...),
    mrn         : str = Form(...),
    age         : str = Form(...),
    sex         : str = Form(...),
    exam_date   : str = Form(...),
    PackHistory : Optional[str] = Form(None),
    FEV1        : Optional[str] = Form(None),
    FEV1PRED    : Optional[str] = Form(None),
    FVC         : Optional[str] = Form(None),
    FVCPRED     : Optional[str] = Form(None),
    MWT1Best    : Optional[str] = Form(None),
    CAT         : Optional[str] = Form(None),
    HAD         : Optional[str] = Form(None),
    SGRQ        : Optional[str] = Form(None),
    gender      : Optional[str] = Form(None),
    smoking     : Optional[str] = Form(None),
    Diabetes    : Optional[str] = Form(None),
    muscular    : Optional[str] = Form(None),
    hypertension: Optional[str] = Form(None),
    AtrialFib   : Optional[str] = Form(None),
    IHD         : Optional[str] = Form(None),
):
    image_data = await file.read()
    validate_image(file, image_data)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    # ── 1. Predict ────────────────────────────────────────────────────────────
    diagnosis, confidence, all_scores, input_tensor = run_prediction(image)

    # ── 2. Grad-CAM ──────────────────────────────────────────────────────────
    cam_img = run_gradcam(image, input_tensor)

    orig_resized = image.resize((224, 224))
    orig_tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    orig_tmp.close()
    cam_tmp  = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    cam_tmp.close()
    orig_resized.save(orig_tmp.name)
    cam_img.save(cam_tmp.name)

    # ── 3. Severity ───────────────────────────────────────────────────────────
    severity_label = None
    _sev_fields = [PackHistory, FEV1, FEV1PRED, FVC, FVCPRED, MWT1Best, CAT, HAD, SGRQ, gender, smoking]
    if all(f is not None and f != "" for f in _sev_fields):
        try:
            sev_row = pd.DataFrame([{
                "AGE": float(age), "PackHistory": float(PackHistory),
                "FEV1": float(FEV1), "FEV1PRED": float(FEV1PRED),
                "FVC": float(FVC), "FVCPRED": float(FVCPRED),
                "MWT1Best": float(MWT1Best), "CAT": float(CAT),
                "HAD": float(HAD), "SGRQ": float(SGRQ),
                "gender": int(gender), "smoking": int(smoking),
                "Diabetes": int(Diabetes or 0), "muscular": int(muscular or 0),
                "hypertension": int(hypertension or 0),
                "AtrialFib": int(AtrialFib or 0), "IHD": int(IHD or 0),
            }])[SEVERITY_FEATURES]
            severity_label = severity_model.predict(sev_row)[0]
        except Exception:
            severity_label = None

    # ── 4. Patient context for RAG ────────────────────────────────────────────
    patient_context = (
        f"Diagnosis: {diagnosis}\n"
        f"Confidence: {confidence}%\n"
        f"Class probabilities - Emphysema: {all_scores['Emphysema']}%, "
        f"Normal: {all_scores['Normal']}%, Other: {all_scores['Other']}%"
    )
    if severity_label:
        patient_context += f"\nSeverity: {severity_label}"

    # ── 5. RAG guidance ───────────────────────────────────────────────────────
    rag_question = (
        f"What is the recommended treatment and management approach for "
        f"{diagnosis} according to GOLD guidelines?"
    )
    try:
        guidance, _ = query_rag(rag_question, k=3, max_tokens=200, patient_context=patient_context)
    except Exception:
        guidance = FALLBACK

    # ── 6. Build PDF ──────────────────────────────────────────────────────────
    report_id = "RPT-" + str(uuid.uuid4())[:5].upper()
    generated = datetime.datetime.now().strftime("%d %b %Y")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 15, 20)

    pdf.set_fill_color(30, 60, 120)
    pdf.rect(0, 0, 210, 22, style="F")
    pdf.set_y(5)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 8, "COPD Vision", align="C", ln=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(0, 5, "AI-Assisted Clinical Decision Support", align="C", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Patient Diagnostic Report", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(130, 130, 130)
    pdf.cell(0, 5, f"Report ID {report_id}  ·  Generated {generated}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Patient Information", ln=True)
    pdf.set_text_color(0, 0, 0)
    col_w = 85
    rows  = [("Name", name, "MRN", mrn), ("Age / Sex", f"{age} / {sex}", "Exam Date", exam_date)]
    for r in rows:
        pdf.set_font("Helvetica", "B", 9); pdf.set_text_color(100, 100, 100)
        pdf.cell(col_w, 5, r[0]); pdf.cell(col_w, 5, r[2], ln=True)
        pdf.set_font("Helvetica", "", 11); pdf.set_text_color(0, 0, 0)
        pdf.cell(col_w, 7, r[1]); pdf.cell(col_w, 7, r[3], ln=True)
        pdf.ln(2)
    pdf.ln(3)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Diagnostic Findings", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 9, diagnosis, ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Confidence {confidence}%  ·  Grad-CAM overlay attached below", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(130, 130, 130)
    pdf.cell(0, 5, f"Emphysema {all_scores['Emphysema']}%   Normal {all_scores['Normal']}%   Other {all_scores['Other']}%", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(85, 5, "Original X-Ray", align="C")
    pdf.cell(85, 5, "Grad-CAM Heatmap", align="C", ln=True)
    pdf.set_text_color(0, 0, 0)
    img_y = pdf.get_y()
    pdf.image(orig_tmp.name, x=20,  y=img_y, w=78)
    pdf.image(cam_tmp.name,  x=108, y=img_y, w=78)
    pdf.set_y(img_y + 80)
    pdf.ln(6)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Severity Assessment", ln=True)
    pdf.set_text_color(0, 0, 0)
    if severity_label:
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(30, 60, 120)
        pdf.cell(0, 8, str(severity_label), ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(130, 130, 130)
        pdf.cell(0, 5, "Based on clinical measurements (FEV1, FVC, CAT, HAD, SGRQ, 6MWT)", ln=True)
        pdf.set_text_color(0, 0, 0)
    else:
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(130, 130, 130)
        pdf.cell(0, 7, "Not assessed - fill in the Severity Assessment fields before downloading the report.", ln=True)
        pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Clinical Guidance", ln=True)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(130, 130, 130)
    pdf.cell(0, 5, "AI-generated  ·  decision support only", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, guidance)
    pdf.ln(4)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Clinician Review", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, "Final decision: ________________________________________________", ln=True)
    pdf.ln(4)
    pdf.cell(95, 7, "Clinician signature: _____________________")
    pdf.cell(0,  7, "Date: ___________________", ln=True)
    pdf.ln(10)

    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(160, 160, 160)
    pdf.multi_cell(0, 4, "This report includes AI-generated content intended as decision support only and does not constitute a final diagnosis or treatment order.")

    pdf_bytes = pdf.output()
    os.unlink(orig_tmp.name)
    os.unlink(cam_tmp.name)

    return StreamingResponse(
        io.BytesIO(bytes(pdf_bytes)),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_id}.pdf"}
    )


@app.post("/severity/predict")
def severity_predict(data: SeverityInput):
    row = pd.DataFrame([data.model_dump()])[SEVERITY_FEATURES]
    prediction = severity_model.predict(row)[0]
    proba      = severity_model.predict_proba(row)[0]
    classes    = severity_model.classes_

    return {
        "severity"  : prediction,
        "all_scores": {cls: round(float(p) * 100, 2) for cls, p in zip(classes, proba)},
    }


# ── Serve React frontend (production build) ───────────────────────────────────
_FRONTEND = os.path.join(BASE, "frontend-dist")

if os.path.isdir(_FRONTEND):
    _assets = os.path.join(_FRONTEND, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        file = os.path.join(_FRONTEND, full_path)
        if os.path.isfile(file):
            return FileResponse(file)
        return FileResponse(os.path.join(_FRONTEND, "index.html"))
