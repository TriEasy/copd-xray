import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Upload, FileImage, ChevronDown, ChevronUp, Download,
  Activity, AlertCircle, CheckCircle, FlaskConical,
} from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
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

const SEVERITY_INFO: Record<string, { description: string; recommendation: string }> = {
  Mild: {
    description: "Mild airflow limitation with minimal symptoms.",
    recommendation: "Lifestyle modifications, smoking cessation, and regular monitoring recommended. Annual spirometry tests advised.",
  },
  Moderate: {
    description: "Moderate airflow limitation with worsening symptoms.",
    recommendation: "Regular monitoring and smoking cessation strongly recommended. Consider bronchodilator therapy and pulmonary rehabilitation.",
  },
  Severe: {
    description: "Severe airflow limitation significantly affecting quality of life.",
    recommendation: "Intensive treatment required. Combination bronchodilator therapy, pulmonary rehabilitation, and close medical supervision essential.",
  },
  "Very Severe": {
    description: "Very severe airflow limitation with potential respiratory failure risk.",
    recommendation: "Urgent medical attention required. Consider oxygen therapy, intensive pharmacological treatment, and potential surgical interventions.",
  },
};

const SEV_LABEL_MAP: Record<string, AnalysisResult["severity"]> = {
  MILD: "Mild", MODERATE: "Moderate", SEVERE: "Severe", "VERY SEVERE": "Very Severe",
};

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

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [severityResult, setSeverityResult] = useState<SeverityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityOpen, setSeverityOpen] = useState(false);

  const hasSeverityData = Boolean(severity.fev1Pred.trim());

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

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setError(null);
    setGradcamUrl(null);

    try {
      // ── 1. Predict ──────────────────────────────────────────────────────────
      const fd1 = new FormData();
      fd1.append("file", imageFile);
      const predRes = await fetch("/predict", { method: "POST", body: fd1 });
      if (!predRes.ok) throw new Error(`Predict failed: ${predRes.status}`);
      const pred = await predRes.json();
      // pred = { prediction, confidence, all_scores: { Emphysema, Normal, Other } }

      // ── 2. Grad-CAM ─────────────────────────────────────────────────────────
      const fd2 = new FormData();
      fd2.append("file", imageFile);
      const camRes = await fetch("/gradcam", { method: "POST", body: fd2 });
      if (camRes.ok) {
        const camBlob = await camRes.blob();
        setGradcamUrl(URL.createObjectURL(camBlob));
      }

      // ── 3. Severity (if fields filled) ──────────────────────────────────────
      let sevLabel: AnalysisResult["severity"] = null;
      let sevResult: SeverityResult | null = null;

      const sevRequired = [
        severity.fev1, severity.fev1Pred, severity.fvc, severity.fvcPred,
        severity.packHistory, severity.sixMWT, severity.catScore,
        severity.hadScore, severity.sgrqScore, severity.gender, severity.smoking,
      ];
      if (sevRequired.every((v) => v !== "")) {
        const sevRes = await fetch("/severity/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            AGE:          parseFloat(patient.age) || 0,
            PackHistory:  parseFloat(severity.packHistory),
            FEV1:         parseFloat(severity.fev1),
            FEV1PRED:     parseFloat(severity.fev1Pred),
            FVC:          parseFloat(severity.fvc),
            FVCPRED:      parseFloat(severity.fvcPred),
            MWT1Best:     parseFloat(severity.sixMWT),
            CAT:          parseFloat(severity.catScore),
            HAD:          parseFloat(severity.hadScore),
            SGRQ:         parseFloat(severity.sgrqScore),
            gender:       severity.gender === "male" ? 1 : 0,
            smoking:      severity.smoking === "current" ? 2 : severity.smoking === "former" ? 1 : 0,
            Diabetes:     severity.diabetes ? 1 : 0,
            muscular:     severity.muscular ? 1 : 0,
            hypertension: severity.hypertension ? 1 : 0,
            AtrialFib:    severity.atrialFib ? 1 : 0,
            IHD:          severity.ihd ? 1 : 0,
          }),
        });
        if (sevRes.ok) {
          const sevData = await sevRes.json();
          sevLabel = SEV_LABEL_MAP[sevData.severity] ?? null;
          if (sevLabel) {
            sevResult = {
              severity: sevLabel,
              ...SEVERITY_INFO[sevLabel],
            };
          }
        }
      }

      const isPositive = pred.prediction !== "Normal";
      const analysisResult: AnalysisResult = {
        diagnosis:    pred.prediction,
        confidence:   pred.confidence,
        emphysemaProb: pred.all_scores.Emphysema,
        normalProb:   pred.all_scores.Normal,
        otherProb:    pred.all_scores.Other,
        severity:     sevLabel,
        isPositive,
      };

      setResult(analysisResult);
      setSeverityResult(isPositive ? sevResult : null);
      sessionStorage.setItem("detectionResult", JSON.stringify(analysisResult));
      if (sevResult) sessionStorage.setItem("severityResult", JSON.stringify(sevResult));

    } catch (err: any) {
      setError(err.message ?? "Analysis failed. Make sure the server is running.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result || !imageFile) return;

    const fd = new FormData();
    fd.append("file",      imageFile);
    fd.append("name",      patient.name     || "Unknown");
    fd.append("mrn",       patient.mrn      || "N/A");
    fd.append("age",       patient.age      || "N/A");
    fd.append("sex",       patient.sex      || "N/A");
    fd.append("exam_date", patient.examDate || new Date().toISOString().slice(0, 10));

    const sevRequired = [
      severity.fev1, severity.fev1Pred, severity.fvc, severity.fvcPred,
      severity.packHistory, severity.sixMWT, severity.catScore,
      severity.hadScore, severity.sgrqScore, severity.gender, severity.smoking,
    ];
    if (sevRequired.every((v) => v !== "")) {
      fd.append("FEV1",         severity.fev1);
      fd.append("FEV1PRED",     severity.fev1Pred);
      fd.append("FVC",          severity.fvc);
      fd.append("FVCPRED",      severity.fvcPred);
      fd.append("PackHistory",  severity.packHistory);
      fd.append("MWT1Best",     severity.sixMWT);
      fd.append("CAT",          severity.catScore);
      fd.append("HAD",          severity.hadScore);
      fd.append("SGRQ",         severity.sgrqScore);
      fd.append("gender",       severity.gender === "male" ? "1" : "0");
      fd.append("smoking",      severity.smoking === "current" ? "2" : severity.smoking === "former" ? "1" : "0");
      fd.append("Diabetes",     severity.diabetes     ? "1" : "0");
      fd.append("muscular",     severity.muscular     ? "1" : "0");
      fd.append("hypertension", severity.hypertension ? "1" : "0");
      fd.append("AtrialFib",    severity.atrialFib    ? "1" : "0");
      fd.append("IHD",          severity.ihd          ? "1" : "0");
    }

    const res = await fetch("/report", { method: "POST", body: fd });
    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "diagnostic_report.pdf";
      a.click();
    } else {
      setError(`PDF failed: ${res.status}`);
    }
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
              <Label htmlFor="p-mrn">MRN</Label>
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

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Clinical Scores</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { id: "pack", label: "Pack History (yrs)", key: "packHistory" },
                    { id: "mwt",  label: "6MWT (m)",           key: "sixMWT" },
                    { id: "cat",  label: "CAT Score",           key: "catScore" },
                    { id: "had",  label: "HAD Score",           key: "hadScore" },
                    { id: "sgrq", label: "SGRQ Score",          key: "sgrqScore" },
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

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

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Confidence</span>
                  <span className="font-bold text-blue-600">{result.confidence}%</span>
                </div>
                <Progress value={result.confidence} className="h-2" />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Probability Breakdown</p>
                {[
                  { label: "Emphysema", value: result.emphysemaProb, color: "bg-red-400" },
                  { label: "Normal",    value: result.normalProb,    color: "bg-green-400" },
                  { label: "Other",     value: result.otherProb,     color: "bg-gray-300" },
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

              {result.isPositive && !hasSeverityData && !severityResult && (
                <Button
                  size="sm"
                  className="w-full mt-auto bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                  onClick={handleContinue}
                >
                  Proceed to Severity Assessment
                </Button>
              )}

              {result.isPositive && severityResult && (
                <div className="mt-2 space-y-3">
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

            {/* Card 3: Real Grad-CAM from API */}
            <Card className="p-4 flex flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Grad-CAM Heatmap
              </p>
              {gradcamUrl ? (
                <img
                  src={gradcamUrl}
                  alt="Grad-CAM Heatmap"
                  className="w-full flex-1 object-contain rounded-lg border border-gray-100"
                  style={{ maxHeight: "280px" }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
                  Loading heatmap…
                </div>
              )}
              <p className="text-xs text-center text-gray-400 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1 align-middle" />
                Red = model focused here
              </p>
            </Card>
          </div>
        )}

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
    </div>
  );
}
