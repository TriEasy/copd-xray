import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [severityResult, setSeverityResult] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "What does Moderate COPD mean?",
    "Can I exercise with COPD?",
    "What foods should I avoid?",
    "How can I improve lung health?",
    "What treatments are available?",
  ];

  useEffect(() => {
    // Load results from session storage
    const detection = sessionStorage.getItem("detectionResult");
    const severity = sessionStorage.getItem("severityResult");

    if (detection) setDetectionResult(JSON.parse(detection));
    if (severity) setSeverityResult(JSON.parse(severity));

    // Welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hello! I'm your COPD AI Assistant. I can help answer questions about COPD, symptoms, treatments, lifestyle changes, medications, and disease management. How can I assist you today?`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Context-aware responses based on severity level
    const severityLevel = severityResult?.severity || "Moderate";

    if (lowerMessage.includes("moderate copd") || lowerMessage.includes("what does moderate")) {
      return `Moderate COPD indicates a stage where airflow limitation is worsening, and symptoms become more noticeable during daily activities. At this stage:

• FEV1 is typically between 50-79% of predicted value
• You may experience shortness of breath during physical activity
• Chronic cough and mucus production may be present
• Regular medical monitoring is essential

Treatment typically includes bronchodilators, pulmonary rehabilitation, and smoking cessation if applicable. It's important to work closely with your healthcare provider to manage symptoms and prevent progression.`;
    }

    if (lowerMessage.includes("exercise") || lowerMessage.includes("physical activity")) {
      return `Yes, exercise is actually beneficial for COPD patients! Here's what you should know:

**Benefits:**
• Improves lung capacity and breathing efficiency
• Strengthens respiratory muscles
• Enhances overall cardiovascular health
• Reduces symptoms and improves quality of life

**Recommended Activities:**
• Walking (start slow, gradually increase)
• Swimming or water aerobics
• Stationary cycling
• Light strength training
• Breathing exercises

**Important Tips:**
• Start slowly and listen to your body
• Use your prescribed medications before exercise
• Avoid exercising in extreme temperatures or poor air quality
• Stop if you experience severe shortness of breath or chest pain
• Work with a pulmonary rehabilitation program for personalized guidance

Always consult your doctor before starting a new exercise program.`;
    }

    if (lowerMessage.includes("food") || lowerMessage.includes("diet") || lowerMessage.includes("nutrition")) {
      return `Nutrition plays an important role in managing COPD. Here are dietary recommendations:

**Foods to Include:**
• Lean proteins (fish, chicken, eggs)
• Fresh fruits and vegetables
• Whole grains
• Healthy fats (olive oil, avocados, nuts)
• Foods rich in antioxidants (berries, leafy greens)

**Foods to Limit or Avoid:**
• Excessive salt (can cause fluid retention)
• Processed and fried foods
• Carbonated beverages (can cause bloating)
• Large meals (eat smaller, frequent meals instead)
• Foods that cause gas (beans, cabbage, onions)

**Additional Tips:**
• Stay well-hydrated
• Maintain a healthy weight
• Consider nutritional supplements if recommended by your doctor
• Eat slowly and in a relaxed environment

A balanced diet helps maintain energy levels and supports immune function.`;
    }

    if (lowerMessage.includes("improve lung") || lowerMessage.includes("lung health")) {
      return `Here are evidence-based strategies to improve lung health with COPD:

**1. Quit Smoking**
• The single most important step
• Slows disease progression significantly
• Improves lung function over time

**2. Breathing Exercises**
• Pursed-lip breathing
• Diaphragmatic breathing
• These help clear airways and improve oxygen intake

**3. Pulmonary Rehabilitation**
• Structured program combining exercise, education, and support
• Proven to improve symptoms and quality of life

**4. Medication Adherence**
• Take prescribed bronchodilators regularly
• Use inhalers correctly (ask for demonstration if needed)
• Don't skip doses

**5. Avoid Irritants**
• Stay away from secondhand smoke
• Minimize exposure to air pollution and chemical fumes
• Use air purifiers at home if needed

**6. Stay Active**
• Regular physical activity strengthens respiratory muscles
• Helps prevent muscle wasting

**7. Get Vaccinated**
• Annual flu vaccine
• Pneumonia vaccine
• COVID-19 vaccination

**8. Manage Stress**
• Practice relaxation techniques
• Join support groups
• Consider counseling if needed

Regular follow-up with your healthcare team is essential to monitor progress and adjust treatment as needed.`;
    }

    if (lowerMessage.includes("treatment") || lowerMessage.includes("medication") || lowerMessage.includes("therapy")) {
      return `COPD treatment typically involves a combination of therapies tailored to disease severity:

**Bronchodilators**
• Short-acting (rescue inhalers): for quick relief
• Long-acting: for daily maintenance
• Help relax airway muscles and improve breathing

**Inhaled Corticosteroids**
• Reduce airway inflammation
• Often combined with bronchodilators
• Used in moderate to severe COPD

**Combination Inhalers**
• Contain both bronchodilators and steroids
• Convenient single-device option

**Oral Medications**
• Theophylline: helps relax airways
• Phosphodiesterase-4 inhibitors: reduce inflammation

**Oxygen Therapy**
• For patients with low blood oxygen levels
• Improves survival and quality of life
• May be needed during activity or continuously

**Pulmonary Rehabilitation**
• Supervised exercise program
• Education and breathing techniques
• Nutritional counseling

**Surgical Options** (severe cases)
• Lung volume reduction surgery
• Bullectomy
• Lung transplant (very severe cases)

**Antibiotics**
• Used during exacerbations or infections
• Not for routine use

Your treatment plan should be personalized based on your severity level${severityLevel ? ` (currently ${severityLevel})` : ""}, symptoms, and overall health. Regular follow-up with your pulmonologist is crucial to optimize treatment.`;
    }

    if (lowerMessage.includes("symptom") || lowerMessage.includes("signs")) {
      return `Common COPD symptoms include:

**Primary Symptoms:**
• Chronic cough (often called "smoker's cough")
• Shortness of breath, especially during physical activities
• Wheezing
• Chest tightness
• Excessive mucus production

**Progressive Symptoms:**
• Fatigue and low energy
• Frequent respiratory infections
• Unintended weight loss (in advanced stages)
• Swelling in ankles, feet, or legs

**Warning Signs of Exacerbation:**
• Worsening shortness of breath
• Change in mucus color or amount
• Increased cough frequency
• Fever
• Confusion or difficulty concentrating

If you experience severe symptoms like bluish lips/fingernails, rapid heartbeat, or severe difficulty breathing, seek immediate medical attention.

Regular monitoring and early intervention for exacerbations can prevent serious complications.`;
    }

    if (lowerMessage.includes("severity") || lowerMessage.includes("stage")) {
      return `COPD severity is classified into four stages based on lung function (FEV1% predicted):

**Stage 1 - Mild COPD**
• FEV1 ≥ 80% of predicted
• Mild airflow limitation
• Often undiagnosed, minimal symptoms

**Stage 2 - Moderate COPD**
• FEV1: 50-79% of predicted
• Worsening airflow limitation
• Symptoms during physical activity
• Medical intervention recommended

**Stage 3 - Severe COPD**
• FEV1: 30-49% of predicted
• Severe airflow limitation
• Significant impact on quality of life
• Frequent exacerbations

**Stage 4 - Very Severe COPD**
• FEV1 < 30% of predicted
• Very severe airflow limitation
• Life-threatening, may need oxygen therapy
• Chronic respiratory failure risk

${severityLevel ? `Based on your assessment, you have ${severityLevel} COPD. ` : ""}
The GOLD (Global Initiative for Chronic Obstructive Lung Disease) classification also considers symptom burden and exacerbation history to guide treatment decisions.`;
    }

    if (lowerMessage.includes("prevent") || lowerMessage.includes("progression")) {
      return `To prevent COPD progression and maintain lung function:

**Critical Steps:**
1. **Stop Smoking Immediately** - Most important factor in slowing disease progression
2. **Take Medications as Prescribed** - Consistent use prevents exacerbations
3. **Attend Pulmonary Rehabilitation** - Improves outcomes significantly

**Lifestyle Modifications:**
• Avoid air pollution, dust, and chemical fumes
• Practice good hand hygiene to prevent infections
• Get adequate rest and manage stress
• Maintain a healthy weight
• Stay physically active within your limits

**Preventive Healthcare:**
• Get vaccinated (flu, pneumonia, COVID-19)
• Regular check-ups with your pulmonologist
• Monitor symptoms and report changes early
• Have an action plan for exacerbations

**Home Environment:**
• Use air purifiers
• Ensure good ventilation
• Avoid strong perfumes and cleaning products
• Keep indoor humidity at appropriate levels

Early intervention and consistent disease management can significantly slow COPD progression and improve quality of life.`;
    }

    // Default response
    return `Thank you for your question. While I can provide general information about COPD, I recommend discussing specific medical concerns with your healthcare provider. 

I can help you with information about:
• COPD symptoms and stages
• Treatment options and medications
• Lifestyle modifications
• Exercise and nutrition
• Disease management strategies

Please feel free to ask any specific questions, or try one of the suggested questions below!`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(input),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          COPD AI Assistant
        </h1>
        <p className="text-lg text-gray-600">
          Ask questions about COPD, symptoms, treatment options, lifestyle changes, and disease management.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Patient Summary */}
        <Card className="p-6 h-fit lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">
            PATIENT SUMMARY
          </h3>

          {detectionResult && (
            <div className="space-y-4 mb-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">COPD Prediction</div>
                <Badge
                  className={`${
                    detectionResult.prediction === "Positive"
                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                      : "bg-green-100 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {detectionResult.prediction}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Confidence Score</div>
                <div className="text-xl font-bold text-blue-600">
                  {detectionResult.confidence}%
                </div>
              </div>
            </div>
          )}

          {severityResult && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <div className="text-xs text-gray-500 mb-1">Severity Level</div>
                <Badge
                  className={`${
                    severityResult.severity === "Very Severe"
                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                      : severityResult.severity === "Severe"
                      ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
                      : severityResult.severity === "Moderate"
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      : "bg-green-100 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {severityResult.severity}
                </Badge>
              </div>
            </div>
          )}

          {!detectionResult && !severityResult && (
            <p className="text-sm text-gray-500">
              No patient data available. Complete the detection and severity assessment first.
            </p>
          )}
        </Card>

        {/* Main Chat Area */}
        <Card className="lg:col-span-3 flex flex-col h-[700px]">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    <div
                      className={`text-xs mt-2 ${
                        message.role === "user" ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-500 mb-3">
                SUGGESTED QUESTIONS
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about COPD..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Medical Disclaimer */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              <span className="font-semibold">Medical Disclaimer:</span> This tool provides AI-assisted information and does not replace professional medical diagnosis.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
