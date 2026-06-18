import { Activity, Brain, ShieldCheck, Stethoscope, Users, Zap } from "lucide-react";
import { Card } from "./ui/card";

export function About() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Detection",
      description: "Advanced machine learning algorithms analyze chest X-rays to detect COPD with high accuracy.",
    },
    {
      icon: Activity,
      title: "Severity Assessment",
      description: "Comprehensive evaluation of disease severity based on clinical parameters and patient history.",
    },
    {
      icon: Stethoscope,
      title: "Medical Guidance",
      description: "Evidence-based recommendations for treatment, lifestyle modifications, and disease management.",
    },
    {
      icon: Zap,
      title: "Instant Analysis",
      description: "Get rapid results and insights to support timely clinical decision-making.",
    },
    {
      icon: Users,
      title: "Patient-Centered",
      description: "Designed to improve patient outcomes through early detection and personalized care.",
    },
    {
      icon: ShieldCheck,
      title: "Clinical Standards",
      description: "Based on GOLD guidelines and latest clinical research in COPD management.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center">
            <Activity className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          About COPD Assistant
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          An AI-powered healthcare platform designed to assist in the early detection, 
          severity assessment, and management of Chronic Obstructive Pulmonary Disease (COPD).
        </p>
      </div>

      {/* Mission Statement */}
      <Card className="p-8 mb-16 bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Our Mission
        </h2>
        <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto leading-relaxed">
          To empower healthcare professionals with advanced AI tools that enable early detection 
          and accurate assessment of COPD, ultimately improving patient outcomes and quality of life 
          through timely intervention and personalized care strategies.
        </p>
      </Card>

      {/* Features Grid */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* About COPD */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Understanding COPD
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              What is COPD?
            </h3>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Chronic Obstructive Pulmonary Disease (COPD) is a progressive lung disease 
              that makes it difficult to breathe. It includes conditions like emphysema 
              and chronic bronchitis.
            </p>
            <p className="text-gray-700 leading-relaxed">
              COPD affects millions of people worldwide and is a leading cause of morbidity 
              and mortality. Early detection and management are crucial for improving patient 
              outcomes.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Risk Factors
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Tobacco smoking (primary cause)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Long-term exposure to air pollutants</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Occupational dust and chemicals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Genetic factors (Alpha-1 antitrypsin deficiency)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Respiratory infections during childhood</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload & Analyze
            </h3>
            <p className="text-gray-600">
              Upload a chest X-ray and enter patient information. Our AI analyzes the data 
              to detect potential COPD indicators.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Assess Severity
            </h3>
            <p className="text-gray-600">
              Provide clinical parameters to determine disease severity level (Mild, Moderate, 
              Severe, or Very Severe).
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Get Guidance
            </h3>
            <p className="text-gray-600">
              Receive personalized recommendations and access our AI assistant for questions 
              about treatment and management.
            </p>
          </Card>
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="p-8 bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
          Important Medical Disclaimer
        </h3>
        <p className="text-gray-700 text-center leading-relaxed">
          COPD Assistant is a clinical decision support tool designed to assist healthcare 
          professionals. It is not intended to replace professional medical judgment, diagnosis, 
          or treatment. All results should be interpreted by qualified healthcare providers in 
          conjunction with clinical examination and other diagnostic tests. This tool is not 
          meant for collecting personally identifiable information (PII) or securing sensitive data.
        </p>
      </Card>
    </div>
  );
}
