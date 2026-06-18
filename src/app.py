from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional
from fastapi.responses import StreamingResponse, HTMLResponse
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

# ── Severity model setup ──────────────────────────────────────────────────────
severity_model = joblib.load(os.path.join(BASE, "saved_models", "copd_severity_model.pkl"))

SEVERITY_FEATURES = [
    "AGE", "PackHistory", "FEV1", "FEV1PRED", "FVC", "FVCPRED",
    "MWT1Best", "CAT", "HAD", "SGRQ",
    "gender", "smoking", "Diabetes", "muscular",
    "hypertension", "AtrialFib", "IHD"
]

# ── Request models ────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def home():
    return """
<!DOCTYPE html>
<html>
<head>
  <title>COPD Detection</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px; }
    h1   { color: #333; }
    .container { display: flex; gap: 30px; align-items: flex-start; margin-top: 30px; }
    .box { background: white; padding: 20px; border-radius: 10px; text-align: center; min-width: 224px; }
    .box h3 { margin-top: 0; color: #555; }
    img  { width: 224px; height: 224px; object-fit: cover; border-radius: 6px; }
    .prediction { font-size: 22px; font-weight: bold; color: #2c7be5; margin: 10px 0; }
    .confidence { font-size: 16px; color: #888; }
    .scores { text-align: left; margin-top: 10px; font-size: 14px; }
    input[type=file] { margin: 20px 0; }
    button { background: #2c7be5; color: white; border: none; padding: 10px 24px;
             border-radius: 6px; font-size: 16px; cursor: pointer; }
    button:hover { background: #1a5cbf; }
    #status { margin-top: 10px; color: #888; }
    /* ── Chat ── */
    #chat-section { margin-top: 40px; max-width: 700px; }
    #chat-section h2 { color: #333; margin-bottom: 8px; }
    #chat-window {
      height: 340px; overflow-y: auto; border: 1px solid #ddd;
      border-radius: 10px; padding: 14px; background: #fafafa;
      display: flex; flex-direction: column; gap: 10px;
    }
    .msg { max-width: 85%; padding: 10px 14px; border-radius: 10px; font-size: 14px; line-height: 1.5; }
    .msg.ai  { background: #e8f0fe; color: #1a3c6e; align-self: flex-start; }
    .msg.you { background: #2c7be5; color: white;   align-self: flex-end; }
    .msg.err { background: #fdecea; color: #c0392b; align-self: flex-start; }
    #chat-input-row { display: flex; gap: 8px; margin-top: 10px; }
    #chat-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    #chat-send  { background: #2c7be5; color: white; border: none; padding: 10px 20px;
                  border-radius: 6px; font-size: 14px; cursor: pointer; }
    #chat-send:hover { background: #1a5cbf; }
  </style>
</head>
<body>
  <h1>COPD X-Ray Detection</h1>

  <div style="display:flex; gap:40px; flex-wrap:wrap;">
    <div>
      <h3 style="margin-bottom:10px">Patient Information</h3>
      <table style="border-spacing:6px">
        <tr><td>Name</td><td><input id="name" placeholder="Jane Doe" style="padding:5px;width:180px"/></td></tr>
        <tr><td>MRN</td><td><input id="mrn"  placeholder="00219384" style="padding:5px;width:180px"/></td></tr>
        <tr><td>Age</td><td><input id="age"  placeholder="54"       style="padding:5px;width:80px"/></td></tr>
        <tr><td>Sex</td><td><input id="sex"  placeholder="F"        style="padding:5px;width:60px"/></td></tr>
        <tr><td>Exam Date</td><td><input id="examdate" type="date"  style="padding:5px;width:180px"/></td></tr>
      </table>
    </div>
    <div>
      <h3 style="margin-bottom:10px">X-Ray Image</h3>
      <input type="file" id="fileInput" accept="image/*" />
    </div>
  </div>

  <br>
  <details open style="margin-top:20px;background:white;padding:16px;border-radius:10px;max-width:780px">
    <summary style="cursor:pointer;font-weight:bold;color:#2c7be5">Severity Assessment <span style="font-size:12px;color:#aaa;font-weight:normal">(optional — fill in for severity prediction in report)</span></summary>
    <div style="display:flex;gap:30px;flex-wrap:wrap;margin-top:14px">
      <div>
        <h4 style="color:#555;margin:0 0 6px">Lung Function</h4>
        <table style="border-spacing:5px">
          <tr><td>FEV1 (L)</td><td><input id="fev1" type="number" step="0.01" placeholder="1.8" style="padding:4px;width:80px"/></td></tr>
          <tr><td>FEV1 % Pred</td><td><input id="fev1pred" type="number" step="0.1" placeholder="65" style="padding:4px;width:80px"/></td></tr>
          <tr><td>FVC (L)</td><td><input id="fvc" type="number" step="0.01" placeholder="3.2" style="padding:4px;width:80px"/></td></tr>
          <tr><td>FVC % Pred</td><td><input id="fvcpred" type="number" step="0.1" placeholder="80" style="padding:4px;width:80px"/></td></tr>
        </table>
      </div>
      <div>
        <h4 style="color:#555;margin:0 0 6px">Clinical Scores</h4>
        <table style="border-spacing:5px">
          <tr><td>Pack History (yrs)</td><td><input id="packhist" type="number" step="0.1" placeholder="20" style="padding:4px;width:80px"/></td></tr>
          <tr><td>6MWT (m)</td><td><input id="mwt1best" type="number" step="1" placeholder="350" style="padding:4px;width:80px"/></td></tr>
          <tr><td>CAT Score</td><td><input id="cat" type="number" step="0.1" placeholder="15" style="padding:4px;width:80px"/></td></tr>
          <tr><td>HAD Score</td><td><input id="had" type="number" step="0.1" placeholder="8" style="padding:4px;width:80px"/></td></tr>
          <tr><td>SGRQ Score</td><td><input id="sgrq" type="number" step="0.1" placeholder="40" style="padding:4px;width:80px"/></td></tr>
        </table>
      </div>
      <div>
        <h4 style="color:#555;margin:0 0 6px">Demographics &amp; Comorbidities</h4>
        <table style="border-spacing:5px">
          <tr><td>Gender</td><td>
            <select id="gender" style="padding:4px;width:110px">
              <option value="">--</option>
              <option value="0">Female</option>
              <option value="1">Male</option>
            </select>
          </td></tr>
          <tr><td>Smoking</td><td>
            <select id="smoking" style="padding:4px;width:110px">
              <option value="">--</option>
              <option value="0">Never</option>
              <option value="1">Ex-smoker</option>
              <option value="2">Current</option>
            </select>
          </td></tr>
          <tr><td>Diabetes</td><td><input id="diabetes" type="checkbox"/></td></tr>
          <tr><td>Muscular</td><td><input id="muscular" type="checkbox"/></td></tr>
          <tr><td>Hypertension</td><td><input id="hypertension" type="checkbox"/></td></tr>
          <tr><td>Atrial Fib</td><td><input id="atrialfib" type="checkbox"/></td></tr>
          <tr><td>IHD</td><td><input id="ihd" type="checkbox"/></td></tr>
        </table>
      </div>
    </div>
  </details>

  <br>
  <button onclick="analyze()">Analyze</button>
  <button onclick="generateReport()" style="background:#27ae60;margin-left:10px">Download Report (PDF)</button>
  <p id="status"></p>

  <div class="container" id="results" style="display:none">
    <div class="box">
      <h3>Original Image</h3>
      <img id="originalImg" src="" />
    </div>
    <div class="box">
      <h3>Prediction</h3>
      <div class="prediction" id="predLabel"></div>
      <div class="confidence" id="predConf"></div>
      <div class="scores" id="predScores"></div>
      <div id="severityRow" style="display:none;margin-top:10px;border-top:1px solid #eee;padding-top:8px">
        <div style="font-size:12px;color:#888;margin-bottom:2px">Severity</div>
        <div class="prediction" id="severityLabel" style="font-size:18px"></div>
        <div class="scores" id="severityScores"></div>
      </div>
    </div>
    <div class="box">
      <h3>Grad-CAM</h3>
      <img id="gradcamImg" src="" />
      <p style="font-size:12px;color:#aaa">Red = model focused here</p>
    </div>
  </div>

  <div id="chat-section">
    <h2>Ask GOLD Guidelines</h2>
    <p style="font-size:13px;color:#888;margin:0 0 10px">Ask any question about COPD management based on the GOLD 2025 report.</p>
    <div id="chat-window">
      <div class="msg ai">Hello! Ask me anything about COPD management from the GOLD 2025 guidelines.</div>
    </div>
    <div id="chat-input-row">
      <input id="chat-input" type="text" placeholder="e.g. What is GOLD stage 3?" />
      <button id="chat-send" onclick="sendChat()">Send</button>
    </div>
  </div>

  <script>
    let currentPatient = "";

    async function analyze() {
      const file = document.getElementById("fileInput").files[0];
      if (!file) { alert("Please pick an image first."); return; }

      document.getElementById("status").innerText = "Analyzing...";
      document.getElementById("results").style.display = "none";

      try {
        document.getElementById("originalImg").src = URL.createObjectURL(file);

        const fd1 = new FormData(); fd1.append("file", file);
        const predRes = await fetch("/predict", { method: "POST", body: fd1 });
        if (!predRes.ok) {
          const err = await predRes.text();
          document.getElementById("status").innerText = "Error " + predRes.status + ": " + err;
          return;
        }
        const pred = await predRes.json();

        document.getElementById("predLabel").innerText = pred.prediction;
        document.getElementById("predConf").innerText  = pred.confidence + "% confidence";
        document.getElementById("predScores").innerHTML =
          "Emphysema: " + pred.all_scores.Emphysema + "%<br>" +
          "Normal: "    + pred.all_scores.Normal    + "%<br>" +
          "Other: "     + pred.all_scores.Other     + "%";

        currentPatient =
          "Diagnosis: " + pred.prediction + " | " +
          "Confidence: " + pred.confidence + "% | " +
          "Emphysema: " + pred.all_scores.Emphysema +
          "% Normal: " + pred.all_scores.Normal +
          "% Other: " + pred.all_scores.Other + "%";

        const fd2 = new FormData(); fd2.append("file", file);
        const camRes = await fetch("/gradcam", { method: "POST", body: fd2 });
        if (!camRes.ok) {
          document.getElementById("status").innerText = "Grad-CAM error " + camRes.status;
          return;
        }
        const camBlob = await camRes.blob();
        document.getElementById("gradcamImg").src = URL.createObjectURL(camBlob);

        // ── Severity ──────────────────────────────────────────────────────────
        const sevIds = ["fev1","fev1pred","fvc","fvcpred","packhist","mwt1best","cat","had","sgrq","gender","smoking"];
        const missing = sevIds.filter(id => document.getElementById(id).value === "");
        document.getElementById("severityRow").style.display = "block";
        document.getElementById("severityLabel").innerText = "debug";
        document.getElementById("severityScores").innerHTML =
          "missing " + missing.length + ": [" + missing.join(", ") + "]";
        if (missing.length === 0) {
          const sevBody = {
            AGE:          parseFloat(document.getElementById("age").value) || 0,
            PackHistory:  parseFloat(document.getElementById("packhist").value),
            FEV1:         parseFloat(document.getElementById("fev1").value),
            FEV1PRED:     parseFloat(document.getElementById("fev1pred").value),
            FVC:          parseFloat(document.getElementById("fvc").value),
            FVCPRED:      parseFloat(document.getElementById("fvcpred").value),
            MWT1Best:     parseFloat(document.getElementById("mwt1best").value),
            CAT:          parseFloat(document.getElementById("cat").value),
            HAD:          parseFloat(document.getElementById("had").value),
            SGRQ:         parseFloat(document.getElementById("sgrq").value),
            gender:       parseInt(document.getElementById("gender").value),
            smoking:      parseInt(document.getElementById("smoking").value),
            Diabetes:     document.getElementById("diabetes").checked     ? 1 : 0,
            muscular:     document.getElementById("muscular").checked     ? 1 : 0,
            hypertension: document.getElementById("hypertension").checked ? 1 : 0,
            AtrialFib:    document.getElementById("atrialfib").checked    ? 1 : 0,
            IHD:          document.getElementById("ihd").checked          ? 1 : 0,
          };
          const sevRes = await fetch("/severity/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sevBody),
          });
          if (sevRes.ok) {
            const sev = await sevRes.json();
            document.getElementById("severityLabel").innerText = sev.severity;
            const scores = Object.entries(sev.all_scores)
              .map(([k, v]) => k + ": " + v + "%").join("<br>");
            document.getElementById("severityScores").innerHTML = scores;
            document.getElementById("severityRow").style.display = "block";
            currentPatient += " | Severity: " + sev.severity;
          } else {
            document.getElementById("severityLabel").innerText = "Error";
            document.getElementById("severityScores").innerHTML =
              "<span style='color:red;font-size:12px'>Failed (" + sevRes.status + ")</span>";
          }
        }

        document.getElementById("status").innerText = "";
        document.getElementById("results").style.display = "flex";
      } catch (e) {
        document.getElementById("status").innerText = "Network error: " + e.message;
      }
    }

    async function generateReport() {
      const file = document.getElementById("fileInput").files[0];
      if (!file) { alert("Please pick an image first."); return; }

      document.getElementById("status").innerText = "Generating report...";

      const fd = new FormData();
      fd.append("file",         file);
      fd.append("name",         document.getElementById("name").value     || "Unknown");
      fd.append("mrn",          document.getElementById("mrn").value      || "N/A");
      fd.append("age",          document.getElementById("age").value      || "N/A");
      fd.append("sex",          document.getElementById("sex").value      || "N/A");
      fd.append("exam_date",    document.getElementById("examdate").value || new Date().toISOString().slice(0,10));

      const sevIds = ["fev1","fev1pred","fvc","fvcpred","packhist","mwt1best","cat","had","sgrq","gender","smoking"];
      const sevFilled = sevIds.every(id => document.getElementById(id).value !== "");
      if (sevFilled) {
        fd.append("FEV1",         document.getElementById("fev1").value);
        fd.append("FEV1PRED",     document.getElementById("fev1pred").value);
        fd.append("FVC",          document.getElementById("fvc").value);
        fd.append("FVCPRED",      document.getElementById("fvcpred").value);
        fd.append("PackHistory",  document.getElementById("packhist").value);
        fd.append("MWT1Best",     document.getElementById("mwt1best").value);
        fd.append("CAT",          document.getElementById("cat").value);
        fd.append("HAD",          document.getElementById("had").value);
        fd.append("SGRQ",         document.getElementById("sgrq").value);
        fd.append("gender",       document.getElementById("gender").value);
        fd.append("smoking",      document.getElementById("smoking").value);
        fd.append("Diabetes",     document.getElementById("diabetes").checked     ? "1" : "0");
        fd.append("muscular",     document.getElementById("muscular").checked     ? "1" : "0");
        fd.append("hypertension", document.getElementById("hypertension").checked ? "1" : "0");
        fd.append("AtrialFib",    document.getElementById("atrialfib").checked    ? "1" : "0");
        fd.append("IHD",          document.getElementById("ihd").checked          ? "1" : "0");
      }

      const res = await fetch("/report", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.text();
        document.getElementById("status").innerText = "Report error " + res.status + ": " + err;
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "diagnostic_report.pdf";
      a.click();

      document.getElementById("status").innerText = "Report downloaded.";
    }

    function appendMsg(text, role) {
      const win = document.getElementById("chat-window");
      const div = document.createElement("div");
      div.className = "msg " + role;
      div.innerText  = text;
      win.appendChild(div);
      win.scrollTop  = win.scrollHeight;
      return div;
    }

    async function sendChat() {
      const input = document.getElementById("chat-input");
      const q     = input.value.trim();
      if (!q) return;
      input.value = "";

      appendMsg(q, "you");
      const thinking = appendMsg("...", "ai");

      try {
        const res  = await fetch("/rag/ask", {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ question: q, k: 3, patient_context: currentPatient }),
        });
        const data = await res.json();
        thinking.innerText = data.answer || "No answer returned.";
      } catch (e) {
        thinking.className  = "msg err";
        thinking.innerText  = "Error: could not reach the server.";
      }
      document.getElementById("chat-window").scrollTop = 999999;
    }

    document.getElementById("chat-input").addEventListener("keydown", e => {
      if (e.key === "Enter") sendChat();
    });
  </script>
</body>
</html>
"""

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
    # ── Severity fields (all optional) ───────────────────────────────────────
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
    image      = Image.open(io.BytesIO(image_data)).convert("RGB")

    # ── 1. Predict ────────────────────────────────────────────────────────────
    diagnosis, confidence, all_scores, input_tensor = run_prediction(image)

    # ── 2. Grad-CAM ───────────────────────────────────────────────────────────
    cam_img = run_gradcam(image, input_tensor)

    # Save both images to temp files for PDF embedding
    orig_resized = image.resize((224, 224))
    orig_tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    orig_tmp.close()
    cam_tmp  = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    cam_tmp.close()
    orig_resized.save(orig_tmp.name)
    cam_img.save(cam_tmp.name)

    # ── 3. Severity (if clinical fields provided) ─────────────────────────────
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

    # ── 4. Build patient context for RAG ─────────────────────────────────────
    patient_context = (
        f"Diagnosis: {diagnosis}\n"
        f"Confidence: {confidence}%\n"
        f"Class probabilities — Emphysema: {all_scores['Emphysema']}%, "
        f"Normal: {all_scores['Normal']}%, Other: {all_scores['Other']}%"
    )
    if severity_label:
        patient_context += f"\nSeverity: {severity_label}"

    # ── 5. RAG ────────────────────────────────────────────────────────────────
    rag_question = f"What is the recommended treatment and management approach for {diagnosis} according to GOLD guidelines?"
    try:
        guidance, _ = query_rag(rag_question, k=3, max_tokens=200, patient_context=patient_context)
    except Exception:
        guidance = FALLBACK

    # ── 4. Build PDF ──────────────────────────────────────────────────────────
    report_id = "RPT-" + str(uuid.uuid4())[:5].upper()
    generated = datetime.datetime.now().strftime("%d %b %Y")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 15, 20)

    # ── Top bar: COPD Vision branding ─────────────────────────────────────────
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

    # ── Report title + ID ─────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Patient Diagnostic Report", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(130, 130, 130)
    pdf.cell(0, 5, f"Report ID {report_id}  ·  Generated {generated}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    # ── Divider ───────────────────────────────────────────────────────────────
    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    # ── Patient information ───────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Patient Information", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    col_w = 85
    rows  = [("Name", name, "MRN", mrn), ("Age / Sex", f"{age} / {sex}", "Exam Date", exam_date)]
    for r in rows:
        pdf.set_font("Helvetica", "B", 9); pdf.set_text_color(100,100,100)
        pdf.cell(col_w, 5, r[0]); pdf.cell(col_w, 5, r[2], ln=True)
        pdf.set_font("Helvetica", "", 11); pdf.set_text_color(0,0,0)
        pdf.cell(col_w, 7, r[1]); pdf.cell(col_w, 7, r[3], ln=True)
        pdf.ln(2)
    pdf.ln(3)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    # ── Diagnostic findings ───────────────────────────────────────────────────
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

    # ── Images side by side ───────────────────────────────────────────────────
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

    # ── Severity assessment ───────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 7, "Severity Assessment", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
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
        pdf.set_text_color(130, 130, 130)
        pdf.cell(0, 7, "Not assessed — fill in the Severity Assessment fields before downloading the report.", ln=True)
        pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)

    # ── Clinical guidance ─────────────────────────────────────────────────────
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

    # ── Clinician review ──────────────────────────────────────────────────────
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

    # ── Disclaimer ────────────────────────────────────────────────────────────
    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(160, 160, 160)
    pdf.multi_cell(0, 4, "This report includes AI-generated content intended as decision support only and does not constitute a final diagnosis or treatment order.")

    # ── Return PDF ────────────────────────────────────────────────────────────
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
        "severity"    : prediction,
        "all_scores"  : {cls: round(float(p) * 100, 2) for cls, p in zip(classes, proba)},
    }
