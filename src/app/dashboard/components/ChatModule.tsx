"use client";

import { useEffect, useRef, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { Land } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number };
type ChatHistory = {
  id: string;
  name: string;
  landId: string;
  landName: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
};

export default function ChatModule() {
  const { lands, activeLandId, activeLand } = useLand();
  const { t, language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userCode, setUserCode] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLanguageChangeNotification, setShowLanguageChangeNotification] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis || null;
    }
  }, []);

  // Set initial welcome message based on language (only on first load)
  useEffect(() => {
    const welcomeMessage = language === "ml" 
      ? "ഹലോ! എങ്ങനെ സഹായിക്കാം? നിങ്ങളുടെ കൃഷി സംബന്ധിച്ച ഏത് ചോദ്യവും ചോദിക്കാം. ഞാൻ മലയാളത്തിൽ മാത്രം മറുപടി നൽകും."
      : "Hello! How can I help you? Feel free to ask any questions about your farming. I will respond only in English.";
    
    setMessages([{ id: "m1", role: "assistant", content: welcomeMessage, ts: Date.now() }]);
  }, []); // Only run once on component mount

  function isMalayalam(text: string) {
    return /[\u0D00-\u0D7F]/.test(text);
  }

  function speak(text: string) {
    try {
      const synth = synthRef.current;
      if (!synth) {
        alert("Text-to-speech not supported in this browser.");
        return;
      }
      // Cancel any ongoing utterances
      if (synth.speaking) synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = isMalayalam(text) ? "ml-IN" : "en-IN";
      utter.rate = 1.0;
      utter.pitch = 1.0;
      synth.speak(utter);
    } catch (e) {
      console.error("speak failed", e);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agrisense.user");
      const c = raw ? JSON.parse(raw)?.code ?? null : null;
      setUserCode(c);
    } catch {}
  }, []);

  // Load chat histories when user code or active land changes
  useEffect(() => {
    if (userCode && activeLandId) {
      loadChatHistories();
    }
  }, [userCode, activeLandId]);

  // Load chat histories from localStorage
  const loadChatHistories = () => {
    if (!userCode || !activeLandId) return;
    
    try {
      const key = `agrisense_chat_histories_${userCode}_${activeLandId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const histories: ChatHistory[] = JSON.parse(stored);
        setChatHistories(histories);
      }
    } catch (error) {
      console.error("Failed to load chat histories:", error);
    }
  };

  // Save chat histories to localStorage
  const saveChatHistories = (histories: ChatHistory[]) => {
    if (!userCode || !activeLandId) return;
    
    try {
      const key = `agrisense_chat_histories_${userCode}_${activeLandId}`;
      localStorage.setItem(key, JSON.stringify(histories));
      setChatHistories(histories);
    } catch (error) {
      console.error("Failed to save chat histories:", error);
    }
  };

  // Create new chat history
  const createNewChatHistory = (name: string) => {
    if (!userCode || !activeLandId || !activeLand) return;
    
    const newHistory: ChatHistory = {
      id: crypto.randomUUID(),
      name,
      landId: activeLandId,
      landName: activeLand.name,
      messages: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    const updatedHistories = [newHistory, ...chatHistories];
    saveChatHistories(updatedHistories);
    setSelectedHistoryId(newHistory.id);
    setMessages([]);
    return newHistory;
  };

  // Load specific chat history
  const loadChatHistory = (historyId: string) => {
    const history = chatHistories.find(h => h.id === historyId);
    if (history) {
      setMessages(history.messages);
      setSelectedHistoryId(historyId);
    }
  };

  // Save current messages to selected history
  const saveCurrentChat = () => {
    if (!selectedHistoryId || messages.length === 0) return;
    
    const updatedHistories = chatHistories.map(history => 
      history.id === selectedHistoryId 
        ? { ...history, messages, lastUpdated: Date.now() }
        : history
    );
    saveChatHistories(updatedHistories);
  };

  // Delete chat history
  const deleteChatHistory = (historyId: string) => {
    const updatedHistories = chatHistories.filter(h => h.id !== historyId);
    saveChatHistories(updatedHistories);
    
    if (selectedHistoryId === historyId) {
      setSelectedHistoryId(null);
      setMessages([]);
    }
  };

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    
    // Create new chat history if none selected
    if (!selectedHistoryId && activeLand) {
      const historyName = `${activeLand.name} - ${new Date().toLocaleDateString()}`;
      createNewChatHistory(historyName);
    }
    
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      // Get active land context
      const landContext = activeLand ? {
        name: activeLand.name,
        location: activeLand.location,
        size: `${activeLand.sizeValue} ${activeLand.sizeUnit}`,
        crop: activeLand.crop,
        soil: language === "ml" ? "അജ്ഞാതം" : "Unknown", // Will be filled from profile
        irrigation: language === "ml" ? "അജ്ഞാതം" : "Unknown" // Will be filled from profile
      } : null;

      console.log("[ChatModule] sending to /api/chat-ollama", {
        model: "mistral:latest",
        history: messages.length,
        promptPreview: text.slice(0, 100),
        landContext
      });

      const resp = await fetch("/api/chat-ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral:latest",
          landContext,
          userCode,
          language,
          landId: activeLandId,
          messages: [
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: "user", content: text },
          ],
        }),
      });
      console.log("[ChatModule] response status", resp.status);
      if (!resp.ok) {
        let serverError = "Request failed";
        try {
          const errJson = await resp.json();
          serverError = errJson?.error || serverError;
        } catch {
          try {
            const errText = await resp.text();
            serverError = errText || serverError;
          } catch {}
        }
        throw new Error(serverError);
      }
      const data = await resp.json();
      console.log("[ChatModule] response json preview", (data?.message?.content || "").slice(0, 120));
      const content = data?.message?.content || "";
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: content || "(no response)",
        ts: Date.now(),
      };
      setMessages((m) => [...m, reply]);

      // Save chat to current history
      setTimeout(() => saveCurrentChat(), 100);

      // Log advisory to selected land if available
      if (activeLandId && userCode) {
        try {
          await fetch("/api/advisory/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: userCode,
              landId: activeLandId,
              question: text,
              answer: content,
              timestamp: Date.now()
            }),
          });
        } catch (err) {
          console.error("Failed to log advisory:", err);
        }
      }
    } catch (e) {
      console.error("[ChatModule] error", e);
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: e instanceof Error ? e.message : "Error connecting to advisory service.",
        ts: Date.now(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setInput("");
      setLoading(false);
    }
  }

  async function toggleRecord() {
    // Prefer browser Web Speech API (no server needed)
    // Types are not in lib.dom for all browsers, so use 'any'
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recording) {
        try { recognitionRef.current?.stop(); } catch {}
        setRecording(false);
        return;
      }
      try {
        const rec = new SpeechRecognition();
        recognitionRef.current = rec;
        rec.lang = "en-IN"; // default
        // Try to infer Malayalam from profile later; allow both via 'ml-IN' alternative
        rec.interimResults = true;
        rec.continuous = true;
        let finalText = "";
        rec.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalText += transcript + " ";
            else interim += transcript;
          }
          // Live preview in the input
          setInput((finalText + interim).trim());
        };
        rec.onerror = (e: any) => {
          console.error("SpeechRecognition error", e);
          setRecording(false);
        };
        rec.onend = () => {
          setRecording(false);
          const text = (finalText || input).trim();
          if (text) sendMessage(text);
        };
        rec.start();
        setRecording(true);
      } catch (e) {
        console.error("SpeechRecognition start failed", e);
        setRecording(false);
      }
      return;
    }
    // Fallback: MediaRecorder only (no STT). Inform user.
    try {
      if (recording) {
        mediaRecorderRef.current?.stop();
        setRecording(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.onstop = async () => {
        setRecording(false);
        alert("Voice recognition not supported in this browser. Please type your question.");
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      setRecording(false);
    }
  }


  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between mt-1 flex-shrink-0">
          <h2 className="text-lg font-semibold">Conversational Interface</h2>
          <div className="flex items-center gap-2">
            {activeLand ? (
              <div className="px-3 py-1 rounded-full text-sm border border-emerald-300 bg-emerald-50 text-emerald-700">
                Advisory for: {activeLand.name}
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full text-sm border border-orange-300 bg-orange-50 text-orange-700">
                Please select a land to get personalized advice
              </div>
            )}
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="px-3 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-sm"
            >
              📚 {language === "ml" ? "ചരിത്രം" : "History"}
            </button>
            <button
              onClick={() => {
                const name = prompt(language === "ml" ? "പുതിയ ചാറ്റിന്റെ പേര്:" : "New chat name:");
                if (name) createNewChatHistory(name);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
            >
              ➕ {language === "ml" ? "പുതിയത്" : "New"}
            </button>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => {
                  const newLanguage = e.target.value as 'en' | 'ml';
                  
                  // Update the global language context
                  setLanguage(newLanguage);
                  
                  // Save current chat if there are messages
                  if (messages.length > 0 && selectedHistoryId) {
                    saveCurrentChat();
                  }
                  
                  // Show notification that conversation is preserved
                  setShowLanguageChangeNotification(true);
                  setTimeout(() => {
                    setShowLanguageChangeNotification(false);
                  }, 3000);
                }}
                className="px-3 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">🌐 English</option>
                <option value="ml">🌐 മലയാളം</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Language Change Notification */}
        {showLanguageChangeNotification && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="text-green-600">✅</div>
              <div className="text-sm text-green-800">
                {language === "ml" 
                  ? "ഭാഷ മാറ്റി! നിങ്ങളുടെ സംഭാഷണം സൂക്ഷിച്ചിരിക്കുന്നു." 
                  : "Language changed! Your conversation is preserved."}
              </div>
            </div>
          </div>
        )}

        {/* Chat History Panel */}
        {showHistoryPanel && (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-800">
                {language === "ml" ? "ചാറ്റ് ചരിത്രം" : "Chat History"}
              </h3>
              <button
                onClick={() => setShowHistoryPanel(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
              {chatHistories.length === 0 ? (
                <p className="text-neutral-500 text-sm">
                  {language === "ml" ? "ഇതുവരെ ചാറ്റ് ചരിത്രം ഇല്ല" : "No chat history yet"}
                </p>
              ) : (
                chatHistories.map((history) => (
                  <div
                    key={history.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedHistoryId === history.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                    onClick={() => loadChatHistory(history.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-neutral-800">
                          {history.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(history.lastUpdated).toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {history.messages.length} {language === "ml" ? "സന്ദേശങ്ങൾ" : "messages"}
                        </div>
                        <div className="text-xs text-blue-600">
                          {language === "ml" ? "ഭാഷ:" : "Language:"} {language === "ml" ? "മലയാളം" : "English"}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatHistory(history.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Black frame */}
        <div className="rounded-2xl bg-neutral-900 p-2 shadow-lg animate-fade-up flex-1 flex flex-col overflow-hidden">
          <div className="rounded-xl bg-white p-3 flex-1 flex flex-col overflow-hidden">
            {/* Quick questions */}
            {activeLand && (
              <div className="mb-3 flex-shrink-0">
                <div className="text-sm font-medium text-neutral-800 mb-2">
                  {language === "ml" ? "ദ്രുത ചോദ്യങ്ങൾ" : "Quick Questions"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    [
                      language === "ml" ? "വള" : "Fertilizer", 
                      language === "ml" ? `${activeLand.crop} വിളയ്ക്ക് എന്ത് വള?` : `Best fertilizer for ${activeLand.crop}?`
                    ],
                    [
                      language === "ml" ? "കാലാവസ്ഥ" : "Weather", 
                      language === "ml" ? "ഇന്ന് എന്ത് ചെയ്യണം?" : "What to do today?"
                    ],
                    [
                      language === "ml" ? "വിളവ്" : "Harvest", 
                      language === "ml" ? `${activeLand.crop} എപ്പോൾ വിളവെടുക്കണം?` : `When to harvest ${activeLand.crop}?`
                    ],
                    [
                      language === "ml" ? "വിൽപ്പന" : "Selling", 
                      language === "ml" ? `${activeLand.crop} എവിടെ വിൽക്കാം?` : `Where to sell ${activeLand.crop}?`
                    ],
                    [
                      language === "ml" ? "ജലം" : "Water", 
                      language === "ml" ? "എത്ര തവണ നനയ്ക്കണം?" : "How often to water?"
                    ],
                    [
                      language === "ml" ? "കീടം" : "Pests", 
                      language === "ml" ? `${activeLand.crop} കീടം എങ്ങനെ തടയാം?` : `How to prevent ${activeLand.crop} pests?`
                    ],
                    [
                      language === "ml" ? "പദ്ധതി" : "Scheme", 
                      language === "ml" ? "എനിക്ക് ലഭ്യമായ പദ്ധതി?" : "Available scheme for me?"
                    ],
                    [
                      language === "ml" ? "വില" : "Price", 
                      language === "ml" ? `${activeLand.crop} നിലവിലെ വില?` : `Current ${activeLand.crop} price?`
                    ],
                  ].map(([label, q]) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(String(q))}
                      className="px-3 py-1 text-xs bg-neutral-100 text-neutral-800 rounded-full hover:bg-neutral-200 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat scroll area */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {userCode && (
                  <>
                    <span className="text-xs text-neutral-600">{language === "ml" ? "കോഡ്:" : "Code:"}</span>
                    <span className="text-xs font-semibold">{userCode}</span>
                  </>
                )}
                {selectedHistoryId && (
                  <span className="text-xs text-emerald-600">
                    {language === "ml" ? "ചരിത്രം:" : "History:"} {chatHistories.find(h => h.id === selectedHistoryId)?.name}
                  </span>
                )}
                <span className="text-xs text-blue-600">
                  {language === "ml" ? "ഭാഷ:" : "Language:"} {language === "ml" ? "മലയാളം" : "English"}
                </span>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <div className="animate-spin w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full"></div>
                  {language === "ml" ? "പ്രതികരിക്കുന്നു..." : "Responding..."}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
                  <div
                    className={`px-3 py-2 rounded-lg shadow-sm border leading-relaxed ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-neutral-50 text-neutral-900 border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-[11px] opacity-70">{m.role}</div>
                      {m.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() => speak(m.content)}
                          className="text-[11px] px-2 py-0.5 rounded border border-neutral-300 hover:bg-neutral-100"
                          title="Play reply"
                        >
                          ▶ Play
                        </button>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input row */}
            <form
              className="mt-3 flex items-center gap-2 flex-shrink-0"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <button
                type="button"
                title="Record Malayalam voice"
                onClick={toggleRecord}
                className={`px-3 py-2 rounded-lg border ${recording ? "bg-red-600 text-white border-red-600" : "border-neutral-300 hover:bg-neutral-100"}`}
              >
                {recording ? "Stop" : "Voice"}
              </button>
              <input
                className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
                placeholder={language === "ml" ? "മലയാളത്തിൽ ചോദ്യം ടൈപ്പ് ചെയ്യുക..." : "Type your question in English..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800">{t("send")}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


