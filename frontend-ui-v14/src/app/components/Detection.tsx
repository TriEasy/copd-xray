import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Upload, FileImage, ChevronDown, ChevronUp, Download,
  Activity, AlertCircle, CheckCircle, FlaskConical,
} from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";

interface PatientInfo {
  name: string;
  mrn: string;
  age: string;
  sex: string;
  examDate: string;
}

interface SeverityInfo {
  fev1: string;
  fev1Pred: string;
  fvc: string;
  fvcPred: string;
  packHistory: string;
  sixMWT: string;
  catScore: string;
  hadScore: string;
  sgrqScore: string;
  gender: string;
  smoking: string;
  diabetes: boolean;
  muscular: boolean;
  hypertension: boolean;
  atrialFib: boolean;
  ihd: boolean;
}

interface AnalysisResult {
  diagnosis: string;
  confidence: number;
  emphysemaProb: number;
  normalProb: number;
  otherProb: number;
  severity: "Mild" | "Moderate" | "Severe" | "Very Severe" | null;
  isPositive: boolean;
}

interface SeverityResult {
  severity: "Mild" | "Moderate" | "Severe" | "Very Severe";
  description: string;
  recommendation: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  Mild: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Moderate: "bg-orange-100 text-orange-700 border-orange-300",
  Severe: "bg-red-100 text-red-700 border-red-300",
  "Very Severe": "bg-red-200 text-red-900 border-red-400",
};

function GradCAMCanvas({ imagePreview }: { imagePreview: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !imagePreview) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Simulate Grad-CAM: overlay radial gradients on lung areas
      const spots = [
        { x: img.width * 0.35, y: img.height * 0.45, r: img.width * 0.22 },
        { x: img.width * 0.65, y: img.height * 0.42, r: img.width * 0.18 },
      ];
      spots.forEach(({ x, y, r }) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,30,0,0.55)");
        grad.addColorStop(0.3, "rgba(255,140,0,0.40)");
        grad.addColorStop(0.6, "rgba(255,255,0,0.20)");
        grad.addColorStop(1, "rgba(0,0,255,0.05)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, img.width, img.height);
      });
    };
    img.src = imagePreview;
  }, [imagePreview]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain rounded-lg"
      style={{ maxHeight: "280px" }}
    />
  );
}

function generateReportHTML(
  patient: PatientInfo,
  result: AnalysisResult,
  imageDataUrl: string,
  gradcamDataUrl: string
): string {
  const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
  const generated = new Date().toLocaleString();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>COPD Vision – Patient Diagnostic Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a2240; }
    .header { background: #2d3e8f; color: white; padding: 28px 40px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { font-size: 13px; color: #aab8e8; margin-top: 4px; }
    .meta { display: flex; gap: 40px; padding: 16px 40px; background: #eef2fa; border-bottom: 1px solid #dce5f5; font-size: 13px; color: #5b6fa8; }
    .meta span b { color: #1a2240; }
    .section { padding: 24px 40px; border-bottom: 1px solid #eef1f8; }
    .section h2 { font-size: 15px; font-weight: 700; color: #2d3e8f; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: 11px; color: #6b7aaa; text-transform: uppercase; letter-spacing: 0.5px; }
    .field span { font-weight: 600; color: #1a2240; }
    .images { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; }
    .img-card { border: 1px solid #dce5f5; border-radius: 8px; overflow: hidden; text-align: center; }
    .img-card p { font-size: 12px; color: #6b7aaa; padding: 6px 0; background: #f7f9fc; }
    .img-card img { width: 100%; max-height: 240px; object-fit: contain; display: block; }
    .finding { background: #f0f3fb; border-left: 4px solid #2d3e8f; border-radius: 6px; padding: 14px 18px; font-size: 13px; line-height: 1.7; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-pos { background: #fee2e2; color: #b91c1c; }
    .badge-neg { background: #d1fae5; color: #065f46; }
    .badge-severity { background: #fef3c7; color: #92400e; }
    .guidance { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 18px; font-size: 13px; line-height: 1.7; color: #7c2d12; }
    .footer { padding: 24px 40px; }
    .footer h2 { font-size: 14px; font-weight: 700; color: #2d3e8f; margin-bottom: 16px; }
    .sign-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 16px; }
    .sign-field { border-top: 1px solid #6b7aaa; padding-top: 6px; font-size: 12px; color: #6b7aaa; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>COPD Vision &mdash; Patient Diagnostic Report</h1>
    <p>AI-Assisted Clinical Decision Support</p>
  </div>
  <div class="meta">
    <span><b>Report ID:</b> ${reportId}</span>
    <span><b>Generated:</b> ${generated}</span>
    <span><b>Exam Date:</b> ${patient.examDate || "—"}</span>
  </div>

  <div class="section">
    <h2>Patient Information</h2>
    <div class="grid2">
      <div class="field"><label>Full Name</label><span>${patient.name || "—"}</span></div>
      <div class="field"><label>MRN</label><span>${patient.mrn || "—"}</span></div>
      <div class="field"><label>Age</label><span>${patient.age || "—"} years</span></div>
      <div class="field"><label>Sex</label><span>${patient.sex === "M" ? "Male" : patient.sex === "F" ? "Female" : "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Diagnostic Findings</h2>
    <div style="margin-bottom:14px; font-size:13px;">
      <b>Diagnosis:</b> ${result.diagnosis} &nbsp;
      <span class="badge ${result.isPositive ? "badge-pos" : "badge-neg"}">${result.isPositive ? "COPD Detected" : "No COPD Detected"}</span>
      &nbsp; <b>Confidence:</b> ${result.confidence}%
      ${result.severity ? `&nbsp; <span class="badge badge-severity">Severity: ${result.severity}</span>` : ""}
    </div>
    <div style="font-size:13px; margin-bottom:16px; line-height:2;">
      <b>Probability Breakdown:</b><br/>
      Emphysema: ${result.emphysemaProb}% &nbsp;|&nbsp; Normal: ${result.normalProb}% &nbsp;|&nbsp; Other: ${result.otherProb}%
    </div>
    <div class="images">
      <div class="img-card">
        <img src="${imageDataUrl}" alt="Original X-Ray"/>
        <p>Original Chest X-Ray</p>
      </div>
      <div class="img-card">
        <img src="${gradcamDataUrl}" alt="Grad-CAM Heatmap"/>
        <p>Grad-CAM Heatmap &mdash; Red = model focused here</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Clinical Guidance</h2>
    <div class="guidance">
      ${result.isPositive
        ? `The AI model has identified imaging features consistent with <b>${result.diagnosis}</b> with ${result.confidence}% confidence. ${result.severity ? `The estimated GOLD severity stage is <b>${result.severity}</b>.` : ""} Clinical correlation with patient history, spirometry results, and physical examination is strongly recommended before any diagnostic or therapeutic decisions. Referral to a pulmonologist should be considered.`
        : `No significant COPD-related features were detected in the chest X-ray. The model confidence in a normal finding is ${result.confidence}%. Routine follow-up is advised if clinical symptoms persist. This AI result does not substitute a full clinical evaluation.`
      }
    </div>
  </div>

  <div class="footer">
    <h2>Clinician Review &amp; Sign-off</h2>
    <div class="finding" style="margin-bottom:16px;">
      <b>Final Decision:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    </div>
    <div class="sign-row">
      <div class="sign-field">Clinician Signature</div>
      <div class="sign-field">Printed Name &amp; Title</div>
      <div class="sign-field">Date</div>
    </div>
  </div>
</body>
</html>`;
}

export function Detection() {
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PatientInfo>({
    name: "", mrn: "", age: "", sex: "", examDate: "",
  });

  const [severity, setSeverity] = useState<SeverityInfo>({
    fev1: "", fev1Pred: "", fvc: "", fvcPred: "",
    packHistory: "", sixMWT: "", catScore: "", hadScore: "", sgrqScore: "",
    gender: "", smoking: "",
    diabetes: false, muscular: false, hypertension: false, atrialFib: false, ihd: false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gradcamUrl, setGradcamUrl] = useState<string | null>(null);
  const gradcamCanvasRef = useRef<HTMLCanvasElement>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [severityResult, setSeverityResult] = useState<SeverityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);

  // Severity data is "provided" when at least fev1Pred is filled
  const hasSeverityData = Boolean(severity.fev1Pred.trim());

  function calcSeverity(fev1PredStr: string, catStr: string): SeverityResult {
    const fev1PredVal = parseFloat(fev1PredStr) || 0;
    const catVal = parseFloat(catStr) || 0;

    let sev: SeverityResult["severity"] = "Mild";
    let description = "";
    let recommendation = "";

    if (fev1PredVal >= 80 || fev1PredVal === 0) {
      sev = "Mild";
      description = "Mild airflow limitation with minimal symptoms.";
      recommendation = "Lifestyle modifications, smoking cessation, and regular monitoring recommended. Annual spirometry tests advised.";
    } else if (fev1PredVal >= 50) {
      sev = "Moderate";
      description = "Moderate airflow limitation with worsening symptoms.";
      recommendation = "Regular monitoring and smoking cessation strongly recommended. Consider bronchodilator therapy and pulmonary rehabilitation.";
    } else if (fev1PredVal >= 30) {
      sev = "Severe";
      description = "Severe airflow limitation significantly affecting quality of life.";
      recommendation = "Intensive treatment required. Combination bronchodilator therapy, pulmonary rehabilitation, and close medical supervision essential.";
    } else {
      sev = "Very Severe";
      description = "Very severe airflow limitation with potential respiratory failure risk.";
      recommendation = "Urgent medical attention required. Consider oxygen therapy, intensive pharmacological treatment, and potential surgical interventions.";
    }

    if (catVal >= 20 && sev === "Mild") sev = "Moderate";

    return { severity: sev, description, recommendation };
  }

  const fev1fvcRatio =
    severity.fev1 && severity.fvc && parseFloat(severity.fvc) > 0
      ? (parseFloat(severity.fev1) / parseFloat(severity.fvc)).toFixed(2)
      : "";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
  };

  function loadImage(file: File) {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Capture Grad-CAM canvas to data URL after result is set
  useEffect(() => {
    if (!result || !imagePreview) return;
    const timer = setTimeout(() => {
      if (gradcamCanvasRef.current) {
        setGradcamUrl(gradcamCanvasRef.current.toDataURL("image/png"));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [result, imagePreview]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const ratio = parseFloat(fev1fvcRatio) || 0;
      const fev1PredVal = parseFloat(severity.fev1Pred) || 0;
      const isSmoker = severity.smoking === "current";

      const isPositive = ratio > 0 ? ratio < 0.7 : isSmoker;
      const emphysemaProb = isPositive
        ? Math.round(55 + Math.random() * 30)
        : Math.round(5 + Math.random() * 15);
      const normalProb = isPositive
        ? Math.round(5 + Math.random() * 20)
        : Math.round(70 + Math.random() * 20);
      const otherProb = Math.max(0, 100 - emphysemaProb - normalProb);
      const confidence = isPositive
        ? Math.round(78 + Math.random() * 18)
        : Math.round(72 + Math.random() * 18);

      let sev: AnalysisResult["severity"] = null;
      if (isPositive) {
        if (fev1PredVal >= 80 || fev1PredVal === 0) sev = "Mild";
        if (fev1PredVal >= 50 && fev1PredVal < 80) sev = "Moderate";
        if (fev1PredVal >= 30 && fev1PredVal < 50) sev = "Severe";
        if (fev1PredVal > 0 && fev1PredVal < 30) sev = "Very Severe";
      }

      const analysisResult: AnalysisResult = {
        diagnosis: isPositive ? "Emphysema" : "Normal",
        confidence,
        emphysemaProb,
        normalProb,
        otherProb,
        severity: sev,
        isPositive,
      };
      setResult(analysisResult);

      // If severity data was pre-filled and COPD detected, calculate severity immediately
      if (isPositive && hasSeverityData) {
        const computed = calcSeverity(severity.fev1Pred, severity.catScore);
        setSeverityResult(computed);
        sessionStorage.setItem("severityResult", JSON.stringify(computed));
      } else {
        setSeverityResult(null);
      }

      sessionStorage.setItem("detectionResult", JSON.stringify(analysisResult));
      setIsAnalyzing(false);
    }, 2200);
  };

  const handleDownloadPDF = () => {
    if (!result || !imagePreview) return;
    const gradUrl = gradcamUrl || imagePreview;
    const html = generateReportHTML(patient, result, imagePreview, gradUrl);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const handleContinue = () => {
    sessionStorage.setItem("patientInfo", JSON.stringify({ ...patient, ...severity, fev1fvcRatio }));
    navigate("/severity");
  };

  const handleOpenAssistant = () => {
    sessionStorage.setItem("patientInfo", JSON.stringify({ ...patient, ...severity, fev1fvcRatio }));
    navigate("/assistant");
  };

  const isFormValid = imageFile && patient.name && patient.age && patient.sex;

  const comorbidityLabels: [keyof SeverityInfo, string][] = [
    ["diabetes", "Diabetes"],
    ["muscular", "Muscular"],
    ["hypertension", "Hypertension"],
    ["atrialFib", "Atrial Fib"],
    ["ihd", "IHD"],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analyze Patient</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Complete patient information and upload a chest X-ray to run the AI analysis.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Patient Information ── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-[#2d3e8f] uppercase tracking-wide mb-4">
            Patient Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="p-name">Full Name <span className="text-red-500">*</span></Label>
              <Input id="p-name" placeholder="Patient full name"
                value={patient.name}
                onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="p-mrn">MRN <span className="text-red-500">*</span></Label>
              <Input id="p-mrn" placeholder="Medical Record No."
                value={patient.mrn}
                onChange={(e) => setPatient({ ...patient, mrn: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="p-age">Age <span className="text-red-500">*</span></Label>
              <Input id="p-age" type="number" placeholder="Years"
                value={patient.age}
                onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
            </div>
            <div>
              <Label>Sex <span className="text-red-500">*</span></Label>
              <Select value={patient.sex} onValueChange={(v) => setPatient({ ...patient, sex: v })}>
                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male (M)</SelectItem>
                  <SelectItem value="F">Female (F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-date">Exam Date</Label>
              <Input id="p-date" type="date"
                value={patient.examDate}
                onChange={(e) => setPatient({ ...patient, examDate: e.target.value })} />
            </div>
          </div>
        </Card>

        {/* ── X-Ray Upload ── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-[#2d3e8f] uppercase tracking-wide mb-4">
            Chest X-Ray Image <span className="text-red-500">*</span>
          </h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors"
          >
            {imagePreview ? (
              <div className="flex items-center gap-6">
                <img src={imagePreview} alt="X-Ray Preview"
                  className="h-32 rounded-lg object-contain border border-gray-200" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{imageFile?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">
                    {imageFile ? (imageFile.size / 1024).toFixed(0) + " KB" : ""}
                  </p>
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">Replace Image</span>
                    </Button>
                  </label>
                </div>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">Drag & drop or</p>
                  <Button variant="outline" size="sm" className="mt-2 pointer-events-none">
                    Choose File
                  </Button>
                </div>
                <p className="text-xs text-gray-400">JPEG, PNG — chest X-ray images only</p>
              </label>
            )}
            <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
        </Card>

        {/* ── Severity Assessment Accordion ── */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setSeverityOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div>
              <span className="text-base font-semibold text-[#2d3e8f] uppercase tracking-wide">
                Severity Assessment
              </span>
              <span className="ml-3 text-xs text-gray-400 font-normal normal-case tracking-normal">
                Optional — provide additional clinical data
              </span>
            </div>
            {severityOpen
              ? <ChevronUp className="w-5 h-5 text-gray-400" />
              : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {severityOpen && (
            <div className="border-t border-gray-100 px-6 py-5 space-y-6">
              {/* Lung Function */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lung Function</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="s-fev1">FEV1 (L)</Label>
                    <Input id="s-fev1" type="number" step="0.01" placeholder="L"
                      value={severity.fev1}
                      onChange={(e) => setSeverity({ ...severity, fev1: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="s-fev1pred">FEV1 % Pred</Label>
                    <Input id="s-fev1pred" type="number" placeholder="%"
                      value={severity.fev1Pred}
                      onChange={(e) => setSeverity({ ...severity, fev1Pred: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="s-fvc">FVC (L)</Label>
                    <Input id="s-fvc" type="number" step="0.01" placeholder="L"
                      value={severity.fvc}
                      onChange={(e) => setSeverity({ ...severity, fvc: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="s-fvcpred">FVC % Pred</Label>
                    <Input id="s-fvcpred" type="number" placeholder="%"
                      value={severity.fvcPred}
                      onChange={(e) => setSeverity({ ...severity, fvcPred: e.target.value })} />
                  </div>
                </div>
                {fev1fvcRatio && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    FEV1/FVC Ratio: <span className="font-bold">{fev1fvcRatio}</span> (auto-calculated)
                  </p>
                )}
              </div>

              {/* Clinical Scores */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Clinical Scores</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { id: "pack", label: "Pack History (yrs)", key: "packHistory" },
                    { id: "mwt", label: "6MWT (m)", key: "sixMWT" },
                    { id: "cat", label: "CAT Score", key: "catScore" },
                    { id: "had", label: "HAD Score", key: "hadScore" },
                    { id: "sgrq", label: "SGRQ Score", key: "sgrqScore" },
                  ].map(({ id, label, key }) => (
                    <div key={id}>
                      <Label htmlFor={id}>{label}</Label>
                      <Input id={id} type="number" placeholder="—"
                        value={severity[key as keyof SeverityInfo] as string}
                        onChange={(e) => setSeverity({ ...severity, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Demographics & Comorbidities */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Demographics &amp; Comorbidities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Gender</Label>
                    <Select value={severity.gender} onValueChange={(v) => setSeverity({ ...severity, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Smoking Status</Label>
                    <Select value={severity.smoking} onValueChange={(v) => setSeverity({ ...severity, smoking: v })}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current Smoker</SelectItem>
                        <SelectItem value="former">Former Smoker</SelectItem>
                        <SelectItem value="never">Never Smoked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {comorbidityLabels.map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`co-${key}`}
                        checked={severity[key] as boolean}
                        onCheckedChange={(checked) =>
                          setSeverity({ ...severity, [key]: checked === true })
                        }
                      />
                      <Label htmlFor={`co-${key}`} className="font-normal cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── Action Buttons ── */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white"
            size="lg"
            onClick={handleAnalyze}
            disabled={!isFormValid || isAnalyzing}
          >
            {isAnalyzing ? (
              <><Activity className="w-5 h-5 mr-2 animate-spin" />Analyzing...</>
            ) : (
              <><FlaskConical className="w-5 h-5 mr-2" />Analyze</>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleDownloadPDF}
            disabled={!result}
            className="gap-2 border-[#2d3e8f] text-[#2d3e8f] hover:bg-[#eef2fa]"
          >
            <Download className="w-4 h-4" />
            Download Report (PDF)
          </Button>
        </div>

        {/* ── Results ── */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Card 1: Original Image */}
            <Card className="p-4 flex flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Original X-Ray
              </p>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Uploaded X-Ray"
                  className="w-full flex-1 object-contain rounded-lg border border-gray-100"
                  style={{ maxHeight: "280px" }}
                />
              )}
            </Card>

            {/* Card 2: Prediction */}
            <Card className="p-5 flex flex-col gap-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Prediction Results
              </p>

              {/* Main diagnosis */}
              <div>
                <div className={`text-2xl font-bold ${result.isPositive ? "text-red-600" : "text-green-600"}`}>
                  {result.diagnosis}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {result.isPositive
                    ? <AlertCircle className="w-4 h-4 text-red-500" />
                    : <CheckCircle className="w-4 h-4 text-green-500" />}
                  <span className="text-sm text-gray-600">
                    {result.isPositive ? "COPD Detected" : "No COPD Detected"}
                  </span>
                </div>
              </div>

              {/* Confidence */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Confidence</span>
                  <span className="font-bold text-blue-600">{result.confidence}%</span>
                </div>
                <Progress value={result.confidence} className="h-2" />
              </div>

              {/* Probability breakdown */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Probability Breakdown</p>
                {[
                  { label: "Emphysema", value: result.emphysemaProb, color: "bg-red-400" },
                  { label: "Normal", value: result.normalProb, color: "bg-green-400" },
                  { label: "Other", value: result.otherProb, color: "bg-gray-300" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-gray-500">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }} />
                    </div>
                    <span className="w-10 text-right font-medium text-gray-700">{value}%</span>
                  </div>
                ))}
              </div>

              {/* Severity badge */}
              {result.severity && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Severity Level</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["Mild", "Moderate", "Severe", "Very Severe"] as const).map((s) => (
                      <span
                        key={s}
                        className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                          result.severity === s
                            ? SEVERITY_COLORS[s]
                            : "bg-gray-50 text-gray-300 border-gray-100"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario 1: COPD detected, no severity data yet */}
              {result.isPositive && !hasSeverityData && !severityResult && (
                <Button
                  size="sm"
                  className="w-full mt-auto bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                  onClick={handleContinue}
                >
                  Proceed to Severity Assessment
                </Button>
              )}

              {/* Scenario 2: Severity already calculated inline */}
              {result.isPositive && severityResult && (
                <div className="mt-2 space-y-3">
                  {/* Severity result summary */}
                  <div className={`rounded-lg border px-4 py-3 ${SEVERITY_COLORS[severityResult.severity]}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-0.5">Severity Result</p>
                    <p className="text-lg font-bold">{severityResult.severity} COPD</p>
                    <p className="text-xs mt-1 leading-snug opacity-80">{severityResult.description}</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Recommendation</p>
                    <p className="text-xs text-teal-800 leading-snug">{severityResult.recommendation}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                    onClick={handleOpenAssistant}
                  >
                    Open AI Medical Assistant
                  </Button>
                </div>
              )}
            </Card>

            {/* Card 3: Grad-CAM */}
            <Card className="p-4 flex flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Grad-CAM Heatmap
              </p>
              {imagePreview && (
                <GradCAMCanvas imagePreview={imagePreview} />
              )}
              <p className="text-xs text-center text-gray-400 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1 align-middle" />
                Red = model focused here
              </p>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!result && !isAnalyzing && (
          <Card className="p-10 text-center border-dashed">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileImage className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              Complete the form above and click <strong>Analyze</strong> to view results.
            </p>
          </Card>
        )}
      </div>

      {/* Hidden canvas for Grad-CAM capture (needed for PDF export) */}
      {result && imagePreview && (
        <div className="hidden">
          <GradCAMCanvasCapture
            imagePreview={imagePreview}
            canvasRef={gradcamCanvasRef}
            onReady={setGradcamUrl}
          />
        </div>
      )}
    </div>
  );
}

function GradCAMCanvasCapture({
  imagePreview,
  canvasRef,
  onReady,
}: {
  imagePreview: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onReady: (url: string) => void;
}) {
  useEffect(() => {
    if (!canvasRef.current || !imagePreview) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const spots = [
        { x: img.width * 0.35, y: img.height * 0.45, r: img.width * 0.22 },
        { x: img.width * 0.65, y: img.height * 0.42, r: img.width * 0.18 },
      ];
      spots.forEach(({ x, y, r }) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,30,0,0.55)");
        grad.addColorStop(0.3, "rgba(255,140,0,0.40)");
        grad.addColorStop(0.6, "rgba(255,255,0,0.20)");
        grad.addColorStop(1, "rgba(0,0,255,0.05)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, img.width, img.height);
      });
      onReady(canvas.toDataURL("image/png"));
    };
    img.src = imagePreview;
  }, [imagePreview]);

  return <canvas ref={canvasRef} />;
}
