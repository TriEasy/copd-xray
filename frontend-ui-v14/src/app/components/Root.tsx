import { useState, useRef, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Send, X, MessageCircle } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import logoImg from "@/imports/Copilot_20260609_143351.png";

// Floating general assistant chat state
interface ChatMsg {
  id: string;
  role: "user" | "bot";
  text: string;
}

const QUICK_REPLIES = [
  "How do I upload an X-ray?",
  "What is COPD?",
  "How does severity work?",
  "Is my data private?",
];

const BOT_ANSWERS: Record<string, string> = {
  "How do I upload an X-ray?":
    "On the Detection page, click the upload area or drag-and-drop your chest X-ray image (JPEG/PNG). Then fill in the patient info and hit Analyze.",
  "What is COPD?":
    "COPD (Chronic Obstructive Pulmonary Disease) is a chronic inflammatory lung disease that causes obstructed airflow. It includes emphysema and chronic bronchitis.",
  "How does severity work?":
    "After detection, go to the Severity Assessment step. Enter clinical values like FEV1, FVC, and symptoms — the tool calculates your GOLD stage.",
  "Is my data private?":
    "Yes. All analysis is performed locally in your browser session. No images or personal data are stored on external servers.",
};

function getBotReply(text: string): string {
  const key = Object.keys(BOT_ANSWERS).find((k) =>
    text.toLowerCase().includes(k.toLowerCase().slice(0, 10))
  );
  if (key) return BOT_ANSWERS[key];
  return "I can help with navigation and general COPD questions. For a personalized analysis, please use the Detection and Severity Assessment steps in the workflow above.";
}

function FloatingDoctor() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "w",
      role: "bot",
      text: "Hi! I'm Dr. Aria, your COPD Vision guide. Ask me anything about using this app or COPD in general!",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", text };
    const botMsg: ChatMsg = {
      id: Date.now() + "b",
      role: "bot",
      text: getBotReply(text),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-28 right-6 z-50 w-80 rounded-2xl shadow-2xl border border-[#dce5f5] bg-white flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#2d3e8f]">
            {/* Mini doctor icon in header */}
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
                {/* Head */}
                <circle cx="18" cy="12" r="7" fill="#ffe0c8" />
                {/* Hair */}
                <path d="M11 11 Q18 4 25 11" fill="#5b4033" />
                {/* White coat body */}
                <rect x="10" y="21" width="16" height="12" rx="3" fill="white" />
                {/* Coat lapels */}
                <path d="M18 21 L14 26 L18 25 L22 26 Z" fill="#e8edf8" />
                {/* Stethoscope */}
                <path d="M14 24 Q12 28 15 30" stroke="#2d3e8f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <circle cx="15" cy="30.5" r="1" fill="#2d3e8f" />
                {/* Red cross on coat */}
                <rect x="20" y="24" width="3" height="1" rx="0.5" fill="#d4183d" />
                <rect x="21" y="23" width="1" height="3" rx="0.5" fill="#d4183d" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold leading-none">Dr. Aria</p>
              <p className="text-blue-200 text-xs mt-0.5">General Assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64 bg-[#f7f9fc]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-snug ${
                    m.role === "user"
                      ? "bg-[#2d3e8f] text-white"
                      : "bg-white text-[#1a2240] border border-[#dce5f5]"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-3 pt-2 flex flex-wrap gap-1 bg-white border-t border-[#eef1f8]">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-2 py-1 rounded-full bg-[#e8edf8] text-[#2d3e8f] hover:bg-[#dce5f5] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-t border-[#eef1f8]">
            <input
              className="flex-1 text-sm outline-none bg-[#f0f3fb] rounded-full px-3 py-1.5 text-[#1a2240] placeholder-[#6b7aaa]"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-[#2d3e8f] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#3d52b5] transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating doctor button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open general assistant"
      >
        <div className="relative">
          {/* Pulse ring */}
          {!open && (
            <span className="absolute inset-0 rounded-full bg-[#2d3e8f]/20 animate-ping" />
          )}
          {/* Doctor SVG avatar */}
          <div className="w-20 h-20 rounded-full bg-white shadow-xl border-2 border-[#2d3e8f]/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 overflow-hidden">
            <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
              {/* Background circle */}
              <circle cx="40" cy="40" r="40" fill="#eef1f8" />
              {/* White coat body */}
              <rect x="20" y="46" width="40" height="34" rx="6" fill="white" />
              {/* Coat detail / lapels */}
              <path d="M40 46 L30 56 L40 53 L50 56 Z" fill="#dce5f5" />
              {/* Blue shirt under coat */}
              <rect x="32" y="46" width="16" height="8" fill="#5b7ec9" />
              {/* Stethoscope */}
              <path d="M30 54 Q26 64 32 70" stroke="#2d3e8f" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="32" cy="71" r="2.5" fill="#2d3e8f" />
              {/* Red cross on coat pocket */}
              <rect x="47" y="53" width="6" height="2" rx="1" fill="#d4183d" />
              <rect x="49" y="51" width="2" height="6" rx="1" fill="#d4183d" />
              {/* Neck */}
              <rect x="36" y="38" width="8" height="9" rx="2" fill="#ffe0c8" />
              {/* Head */}
              <circle cx="40" cy="30" r="13" fill="#ffe0c8" />
              {/* Hair */}
              <path d="M27 28 Q27 16 40 15 Q53 16 53 28 Q51 20 40 19 Q29 20 27 28Z" fill="#4a3225" />
              {/* Eyes */}
              <ellipse cx="35" cy="30" rx="2" ry="2.2" fill="#2a1f1a" />
              <ellipse cx="45" cy="30" rx="2" ry="2.2" fill="#2a1f1a" />
              {/* Eye shine */}
              <circle cx="36" cy="29" r="0.7" fill="white" />
              <circle cx="46" cy="29" r="0.7" fill="white" />
              {/* Smile */}
              <path d="M35 36 Q40 40 45 36" stroke="#c8825a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Cheeks */}
              <ellipse cx="32" cy="34" rx="3" ry="2" fill="#ffb89a" opacity="0.4" />
              <ellipse cx="48" cy="34" rx="3" ry="2" fill="#ffb89a" opacity="0.4" />
              {/* Ears */}
              <ellipse cx="27" cy="30" rx="2.5" ry="3.5" fill="#ffe0c8" />
              <ellipse cx="53" cy="30" rx="2.5" ry="3.5" fill="#ffe0c8" />
            </svg>
          </div>
          {/* Tooltip */}
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1a2240] text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            Ask Dr. Aria
          </span>
          {/* Notification dot */}
          {!open && (
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
          )}
        </div>
      </button>
    </>
  );
}

export function Root() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="border-b border-[#dce5f5] bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <ImageWithFallback
                src={logoImg}
                alt="COPD Vision logo"
                className="h-16 w-auto object-contain"
              />
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-[#e8edf8] text-[#2d3e8f]"
                      : "text-[#6b7aaa] hover:text-[#2d3e8f] hover:bg-[#f0f3fb]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <FloatingDoctor />
    </div>
  );
}
