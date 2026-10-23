"use client";

import { useEffect, useRef, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch } from "@/lib/auth";

const EXAMPLE_TEXT =
  "Quotation for Sharma Ji, 80 sq ft wardrobe at 1600 per sq ft";
const MAX_RECORDING_SECONDS = 60;

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

interface LineItem {
  item_name: string;
  quantity: number;
  rate: number;
  unit: string;
  amount: number;
}

interface Quotation {
  quotation_id: string;
  client_name: string;
  items: LineItem[];
  total_before_gst: number;
  gst_amount: number;
  grand_total: number;
  pdf_url: string | null;
  created_at: string;
}

type Mode = "text" | "voice";
type RecordingState = "idle" | "recording" | "recorded";

export default function QuotationsPage() {
  const [history, setHistory] = useState<Quotation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await authFetch("/api/quotations");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.quotations);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setMicError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicError("Voice recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setRecordingState("recorded");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState("recording");
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setMicError("Couldn't access your microphone. Check your browser's mic permission for this site.");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingState("idle");
    setRecordingSeconds(0);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    discardRecording();
  }

  async function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setText("");
      await loadHistory();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAudio() {
    if (!audioBlob) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      formData.append("audio", audioBlob, `recording.${ext}`);

      const res = await authFetch("/api/quotations/audio", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      discardRecording();
      await loadHistory();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedLayout>
      <h1 className="text-xl font-bold text-slate-900">Quotations</h1>
      <p className="text-sm text-slate-500 mb-5">Describe or record a new job to generate a branded PDF quotation.</p>

      <div className="flex gap-2 mb-4 bg-slate-100 rounded-xl p-1 max-w-xs">
        <button
          type="button"
          onClick={() => switchMode("text")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === "text" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          ⌨️ Type it
        </button>
        <button
          type="button"
          onClick={() => switchMode("voice")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === "voice" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          🎤 Say it
        </button>
      </div>

      {mode === "text" ? (
        <form
          onSubmit={handleSubmitText}
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 mb-4"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE_TEXT}
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => setText(EXAMPLE_TEXT)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              Use example
            </button>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold px-6 py-2.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating…" : "Generate Quotation"}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 mb-4">
          <div className="flex flex-col items-center justify-center py-4">
            {recordingState === "idle" && (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-sky-600 to-blue-700 text-white text-2xl shadow-lg flex items-center justify-center"
                  aria-label="Start recording"
                >
                  🎤
                </button>
                <p className="mt-3 text-sm text-slate-400">Tap to start recording</p>
              </>
            )}
            {recordingState === "recording" && (
              <>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-500 text-white text-2xl shadow-lg animate-pulse flex items-center justify-center"
                  aria-label="Stop recording"
                >
                  ⏹️
                </button>
                <p className="mt-3 text-sm font-semibold text-red-600">
                  Recording… {recordingSeconds}s / {MAX_RECORDING_SECONDS}s
                </p>
              </>
            )}
            {recordingState === "recorded" && audioPreviewUrl && (
              <div className="w-full flex flex-col items-center gap-3">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio src={audioPreviewUrl} controls className="w-full" />
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={discardRecording}
                    className="flex-1 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    Re-record
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAudio}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold py-2.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Generating…" : "Generate Quotation"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {micError && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {micError}
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">History</h2>
        {historyLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-400">No quotations yet — create your first one above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((q) => (
              <div key={q.quotation_id} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{q.client_name || "Untitled"}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(q.created_at).toLocaleString("en-IN")} · {q.items.length} item
                      {q.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      ₹{q.grand_total.toLocaleString("en-IN")}
                    </p>
                    {q.pdf_url && (
                      <a
                        href={q.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-sky-600 hover:text-sky-700"
                      >
                        PDF ↓
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
