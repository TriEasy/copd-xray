import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Activity, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Badge } from "./ui/badge";

interface SeverityInfo {
  fev1Pred: string;
  catScore: string;
  sgrqScore: string;
  mwt1Best: string;
  fev1: string;
  packHistory: string;
  diabetes: string;
  hypertension: string;
  atrialFibrillation: string;
  ischemicHeartDisease: string;
}

interface SeverityResult {
  severity: "Mild" | "Moderate" | "Severe" | "Very Severe";
  description: string;
  recommendation: string;
}

export function SeverityAssessment() {
  const navigate = useNavigate();
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [severityInfo, setSeverityInfo] = useState<SeverityInfo>({
    fev1Pred: "",
    catScore: "",
    sgrqScore: "",
    mwt1Best: "",
    fev1: "",
    packHistory: "",
    diabetes: "",
    hypertension: "",
    atrialFibrillation: "",
    ischemicHeartDisease: "",
  });
  const [result, setResult] = useState<SeverityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    // Load detection result from session storage
    const stored = sessionStorage.getItem("detectionResult");
    const patientInfo = sessionStorage.getItem("patientInfo");
    
    if (stored) {
      setDetectionResult(JSON.parse(stored));
    }
    
    // Pre-fill some fields from patient info
    if (patientInfo) {
      const info = JSON.parse(patientInfo);
      setSeverityInfo(prev => ({
        ...prev,
        fev1Pred: info.fev1Pred || "",
        fev1: info.fev1 || "",
        packHistory: info.packHistory || "",
      }));
    }
  }, []);

  const handleCalculate = () => {
    setIsCalculating(true);

    setTimeout(() => {
      // Mock severity calculation based on FEV1Pred
      const fev1PredValue = parseFloat(severityInfo.fev1Pred) || 0;
      const catScoreValue = parseFloat(severityInfo.catScore) || 0;
      
      let severity: "Mild" | "Moderate" | "Severe" | "Very Severe" = "Mild";
      let description = "";
      let recommendation = "";

      if (fev1PredValue >= 80) {
        severity = "Mild";
        description = "Mild airflow limitation with minimal symptoms.";
        recommendation = "Lifestyle modifications, smoking cessation, and regular monitoring recommended. Annual spirometry tests advised.";
      } else if (fev1PredValue >= 50) {
        severity = "Moderate";
        description = "Moderate airflow limitation with worsening symptoms.";
        recommendation = "Regular monitoring and smoking cessation are strongly recommended. Consider bronchodilator therapy and pulmonary rehabilitation.";
      } else if (fev1PredValue >= 30) {
        severity = "Severe";
        description = "Severe airflow limitation significantly affecting quality of life.";
        recommendation = "Intensive treatment required. Combination bronchodilator therapy, pulmonary rehabilitation, and close medical supervision essential.";
      } else {
        severity = "Very Severe";
        description = "Very severe airflow limitation with potential respiratory failure risk.";
        recommendation = "Urgent medical attention required. Consider oxygen therapy, intensive pharmacological treatment, and potential surgical interventions.";
      }

      // Adjust severity based on CAT score
      if (catScoreValue >= 20 && severity === "Mild") {
        severity = "Moderate";
      }

      setResult({ severity, description, recommendation });
      setIsCalculating(false);
      
      // Store result in session storage
      sessionStorage.setItem("severityResult", JSON.stringify({ severity, description, recommendation }));
    }, 1500);
  };

  const handleContinue = () => {
    navigate("/assistant");
  };

  const isFormValid = severityInfo.fev1Pred && severityInfo.catScore &&
                      severityInfo.sgrqScore && severityInfo.diabetes &&
                      severityInfo.hypertension;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Mild":
        return "bg-green-100 text-green-700 border-green-300";
      case "Moderate":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Severe":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "Very Severe":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          COPD Severity Evaluation
        </h1>
        <p className="text-lg text-gray-600">
          Provide additional clinical information to determine disease severity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Detection Summary */}
        {detectionResult && (
          <Card className="p-6 h-fit">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">
              DETECTION SUMMARY
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Prediction</div>
                <Badge className={`${
                  detectionResult.prediction === "Positive" 
                    ? "bg-red-100 text-red-700 hover:bg-red-100" 
                    : "bg-green-100 text-green-700 hover:bg-green-100"
                }`}>
                  {detectionResult.prediction}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Confidence</div>
                <div className="text-lg font-semibold text-blue-600">
                  {detectionResult.confidence}%
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Center - Form */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Clinical Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Respiratory Parameters */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Respiratory Parameters
              </h3>
            </div>

            <div>
              <Label htmlFor="fev1Pred">
                FEV1 Predicted (%)
                <span className="ml-2 text-xs font-normal text-gray-400">From spirometry report</span>
              </Label>
              <Input
                id="fev1Pred"
                type="number"
                placeholder="Predicted FEV1 percentage"
                value={severityInfo.fev1Pred}
                onChange={(e) =>
                  setSeverityInfo({ ...severityInfo, fev1Pred: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="fev1">FEV1 (L)</Label>
              <Input
                id="fev1"
                type="number"
                step="0.01"
                placeholder="Liters"
                value={severityInfo.fev1}
                onChange={(e) =>
                  setSeverityInfo({ ...severityInfo, fev1: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="catScore">CAT Score</Label>
              <Input
                id="catScore"
                type="number"
                placeholder="COPD Assessment Test score (0-40)"
                value={severityInfo.catScore}
                onChange={(e) =>
                  setSeverityInfo({ ...severityInfo, catScore: e.target.value })
                }
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0-40</p>
            </div>

            <div>
              <Label htmlFor="sgrqScore">SGRQ Score</Label>
              <Input
                id="sgrqScore"
                type="number"
                placeholder="St. George's Respiratory Questionnaire"
                value={severityInfo.sgrqScore}
                onChange={(e) =>
                  setSeverityInfo({ ...severityInfo, sgrqScore: e.target.value })
                }
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0-100</p>
            </div>

            <div>
              <Label htmlFor="mwt1Best">MWT1Best (meters)</Label>
              <Input
                id="mwt1Best"
                type="number"
                placeholder="6-minute walk test distance"
                value={severityInfo.mwt1Best}
                onChange={(e) =>
                  setSeverityInfo({ ...severityInfo, mwt1Best: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="packHistory">Pack History</Label>
              <Input
                id="packHistory"
                type="number"
                placeholder="Pack-years"
                value={severityInfo.packHistory}
                onChange={(e) =>
                  setSeverityInfo({ ...severityInfo, packHistory: e.target.value })
                }
              />
            </div>

            {/* Comorbidities */}
            <div className="space-y-4 md:col-span-2 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Comorbidities
              </h3>
            </div>

            <div>
              <Label className="mb-2 block">Diabetes</Label>
              <RadioGroup
                value={severityInfo.diabetes}
                onValueChange={(value) =>
                  setSeverityInfo({ ...severityInfo, diabetes: value })
                }
              >
                <div className="flex gap-3">
                  <div>
                    <RadioGroupItem value="yes" id="diabetes-yes" className="sr-only" />
                    <Label htmlFor="diabetes-yes" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.diabetes === "yes" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>Yes</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="no" id="diabetes-no" className="sr-only" />
                    <Label htmlFor="diabetes-no" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.diabetes === "no" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-2 block">Hypertension</Label>
              <RadioGroup
                value={severityInfo.hypertension}
                onValueChange={(value) =>
                  setSeverityInfo({ ...severityInfo, hypertension: value })
                }
              >
                <div className="flex gap-3">
                  <div>
                    <RadioGroupItem value="yes" id="hypertension-yes" className="sr-only" />
                    <Label htmlFor="hypertension-yes" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.hypertension === "yes" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>Yes</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="no" id="hypertension-no" className="sr-only" />
                    <Label htmlFor="hypertension-no" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.hypertension === "no" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-2 block">Atrial Fibrillation</Label>
              <RadioGroup
                value={severityInfo.atrialFibrillation}
                onValueChange={(value) =>
                  setSeverityInfo({ ...severityInfo, atrialFibrillation: value })
                }
              >
                <div className="flex gap-3">
                  <div>
                    <RadioGroupItem value="yes" id="afib-yes" className="sr-only" />
                    <Label htmlFor="afib-yes" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.atrialFibrillation === "yes" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>Yes</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="no" id="afib-no" className="sr-only" />
                    <Label htmlFor="afib-no" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.atrialFibrillation === "no" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-2 block">Ischemic Heart Disease</Label>
              <RadioGroup
                value={severityInfo.ischemicHeartDisease}
                onValueChange={(value) =>
                  setSeverityInfo({ ...severityInfo, ischemicHeartDisease: value })
                }
              >
                <div className="flex gap-3">
                  <div>
                    <RadioGroupItem value="yes" id="ihd-yes" className="sr-only" />
                    <Label htmlFor="ihd-yes" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.ischemicHeartDisease === "yes" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>Yes</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="no" id="ihd-no" className="sr-only" />
                    <Label htmlFor="ihd-no" className={`cursor-pointer px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors select-none ${severityInfo.ischemicHeartDisease === "no" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Button
            className="w-full mt-8 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
            size="lg"
            onClick={handleCalculate}
            disabled={!isFormValid || isCalculating}
          >
            {isCalculating ? (
              <>
                <Activity className="w-5 h-5 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate Severity"
            )}
          </Button>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <Card className="mt-8 p-8 border-2 border-blue-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Severity Assessment Result
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Severity Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className={`px-8 py-4 rounded-lg border-2 ${getSeverityColor(result.severity)}`}>
                <div className="text-sm font-medium mb-1">Severity Level</div>
                <div className="text-3xl font-bold">{result.severity} COPD</div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{result.description}</p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Clinical Recommendation
                  </h3>
                  <p className="text-gray-700">{result.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
              size="lg"
              onClick={handleContinue}
            >
              Open AI Medical Assistant
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
