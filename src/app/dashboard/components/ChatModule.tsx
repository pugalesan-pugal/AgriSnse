"use client";

import { useEffect, useRef, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { Land } from "./types";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number };

export default function ChatModule() {
  const { lands, activeLandId, activeLand } = useLand();
  const [messages, setMessages] = useState<Message[]>([
    { id: "m1", role: "assistant", content: "ഹലോ! എങ്ങനെ സഹായിക്കാം? (Hello! How can I help?)", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [userCode, setUserCode] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis || null;
    }
  }, []);

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

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);

    try {
      // Get active land context
      const landContext = activeLand ? {
        name: activeLand.name,
        location: activeLand.location,
        size: `${activeLand.sizeValue} ${activeLand.sizeUnit}`,
        crop: activeLand.crop,
        soil: "Unknown", // Will be filled from profile
        irrigation: "Unknown" // Will be filled from profile
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
    <div className="h-full flex flex-col bg-white">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between mt-1">
          <h2 className="text-lg font-semibold">Conversational Interface</h2>
          {activeLand ? (
            <div className="px-3 py-1 rounded-full text-sm border border-emerald-300 bg-emerald-50 text-emerald-700">
              Advisory for: {activeLand.name}
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full text-sm border border-orange-300 bg-orange-50 text-orange-700">
              Please select a land to get personalized advice
            </div>
          )}
        </div>

        {/* Black frame */}
        <div className="rounded-2xl bg-neutral-900 p-2 shadow-lg animate-fade-up">
          <div className="rounded-xl bg-white p-3">
            {/* Quick questions */}
            {activeLand && (
              <div className="mb-3">
                <div className="text-sm font-medium text-neutral-800 mb-2">Quick Questions</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Fertilizer Advice", "What fertilizer should I use for my crop?"],
                    ["Weather Impact", "How is the weather affecting my crop?"],
                    ["Harvest Timing", "When should I harvest my crop?"],
                    ["Market Info", "Where can I sell my crop?"],
                    ["Irrigation", "What irrigation schedule should I follow?"],
                    ["Pest Control", "How to prevent pests in my crop?"],
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
            <div className="flex items-center gap-2 mb-2">
              {userCode && (
                <>
                  <span className="text-xs text-neutral-600">Code:</span>
                  <span className="text-xs font-semibold">{userCode}</span>
                </>
              )}
            </div>
            <div className="h-[52vh] md:h-[58vh] overflow-y-auto space-y-3 pr-1">
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
              className="mt-3 flex items-center gap-2"
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
                placeholder="Type your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


