"use client";

import { useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number };

export default function ChatModule() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "m1", role: "assistant", content: "ഹലോ! എങ്ങനെ സഹായിക്കാം? (Hello! How can I help?)", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);

    // TODO: Replace with GPT API call; placeholder echo
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Placeholder response for: ${text}`,
      ts: Date.now(),
    };
    setMessages((m) => [...m, reply]);
    setInput("");
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
      <h2 className="text-lg font-semibold mb-3">Conversational Interface</h2>
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


