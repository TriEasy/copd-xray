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

  const buildPatientContext = (): string => {
    if (!detectionResult) return "";
    let ctx =
      `Diagnosis: ${detectionResult.diagnosis} | Confidence: ${detectionResult.confidence}%` +
      ` | Emphysema: ${detectionResult.emphysemaProb}% | Normal: ${detectionResult.normalProb}%` +
      ` | Other: ${detectionResult.otherProb}%`;
    if (detectionResult.severity) ctx += ` | Severity: ${detectionResult.severity}`;
    if (severityResult?.severity) ctx += ` | Severity Level: ${severityResult.severity}`;
    return ctx;
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
    const question = input;
    setInput("");
    setIsTyping(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const res = await fetch("/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          k: 3,
          patient_context: buildPatientContext(),
          history,
        }),
      });

      const data = await res.json();
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "No answer returned.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Error: could not reach the server. Make sure the backend is running.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
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
