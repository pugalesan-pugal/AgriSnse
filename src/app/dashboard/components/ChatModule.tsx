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
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        // TODO: Send to Google Speech API (Malayalam) and set text
        console.log("Recorded audio placeholder", blob.size);
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
    }
  }


  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
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
      
      {!activeLand && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-sm text-orange-800">
            <strong>No land selected.</strong> Go to Farmer Profile to select a land for personalized agricultural advice.
          </div>
        </div>
      )}

      {activeLand && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-800 mb-2">Quick Questions:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendMessage("What fertilizer should I use for my crop?")}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Fertilizer Advice
            </button>
            <button
              onClick={() => sendMessage("How is the weather affecting my crop?")}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Weather Impact
            </button>
            <button
              onClick={() => sendMessage("When should I harvest my crop?")}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Harvest Timing
            </button>
            <button
              onClick={() => sendMessage("Where can I sell my crop?")}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Market Info
            </button>
            <button
              onClick={() => sendMessage("What irrigation schedule should I follow?")}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Irrigation
            </button>
            <button
              onClick={() => sendMessage("How to prevent pests in my crop?")}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Pest Control
            </button>
          </div>
        </div>
      )}
      {userCode && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-neutral-600">Code:</span>
          <span className="text-xs font-semibold">{userCode}</span>
        <select
          className="ml-auto border border-neutral-300 rounded-lg px-2 py-1 text-sm"
          value={activeLandId || ""}
          onChange={(e) => {
            // Land selection is now handled globally
            console.log("Land selection changed to:", e.target.value);
          }}
          title="Context: land for advice"
        >
            <option value="">All lands / none</option>
            {lands.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
            <div
              className={`px-3 py-2 rounded-lg shadow-sm border ${
                m.role === "user" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200"
              }`}
            >
              <div className="text-xs text-neutral-500 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
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
  );
}


