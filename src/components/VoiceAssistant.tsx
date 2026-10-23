"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";

const MAX_RECORDING_SECONDS = 20;

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

const POST_ACTION_ROUTE: Record<string, string> = {
  create_quotation: "/quotations",
  log_expense: "/expenses",
  add_client: "/clients",
  add_ledger_entry: "/ledger",
  mark_ledger_paid: "/ledger",
};

interface ClassifyResult {
  action: string;
  confirmation_text: string;
  page?: string | null;
  [key: string]: unknown;
}

type AssistantState = "idle" | "recording" | "processing" | "confirming" | "executing";

export default function VoiceAssistant() {
  const router = useRouter();
  const [state, setState] = useState<AssistantState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState<ClassifyResult | null>(null);
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function startRecording() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setToast({ text: "Voice isn't supported in this browser.", isError: true });
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
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        void handleClassify(blob, mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setToast({ text: "Couldn't access your microphone.", isError: true });
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setState("processing");
  }

  async function handleClassify(blob: Blob, mimeType: string | undefined) {
    try {
      const formData = new FormData();
      const ext = mimeType?.includes("mp4") ? "m4a" : "webm";
      formData.append("audio", blob, `command.${ext}`);

      const res = await authFetch("/api/voice-command", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setToast({ text: data.error || "Something went wrong.", isError: true });
        setState("idle");
        return;
      }

      const result = data as ClassifyResult;

      if (result.action === "navigate" && result.page) {
        router.push(`/${result.page}`);
        setToast({ text: result.confirmation_text, isError: false });
        setState("idle");
        return;
      }

      if (result.action === "unknown") {
        setToast({ text: result.confirmation_text, isError: true });
        setState("idle");
        return;
      }

      setPending(result);
      setState("confirming");
    } catch {
      setToast({ text: "Couldn't reach the server.", isError: true });
      setState("idle");
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    setState("executing");
    try {
      const res = await authFetch("/api/voice-command/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      const data = await res.json();

      if (!res.ok) {
        setToast({ text: data.error || "Something went wrong.", isError: true });
        setState("idle");
        setPending(null);
        return;
      }

      setToast({ text: "Done.", isError: false });
      const route = POST_ACTION_ROUTE[pending.action];
      if (route) router.push(route);
    } catch {
      setToast({ text: "Couldn't reach the server.", isError: true });
    } finally {
      setState("idle");
      setPending(null);
    }
  }

  function handleCancel() {
    setPending(null);
    setState("idle");
  }

  return (
    <>
      {/* Floating mic button */}
      {state !== "confirming" && (
        <button
          onClick={state === "recording" ? stopRecording : state === "idle" ? startRecording : undefined}
          disabled={state === "processing" || state === "executing"}
          aria-label={state === "recording" ? "Stop recording" : "Start voice command"}
          className={`fixed bottom-24 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all ${
            state === "recording"
              ? "bg-red-500 text-white animate-pulse"
              : state === "processing" || state === "executing"
                ? "bg-slate-300 text-white cursor-not-allowed"
                : "bg-gradient-to-br from-sky-600 to-blue-700 text-white hover:shadow-xl"
          }`}
        >
          {state === "recording" ? "⏹️" : state === "processing" || state === "executing" ? "…" : "🎤"}
        </button>
      )}

      {state === "recording" && (
        <div className="fixed bottom-[9.5rem] sm:bottom-24 left-1/2 -translate-x-1/2 z-40 text-xs font-semibold text-red-600 bg-white px-3 py-1.5 rounded-full shadow-md">
          Listening… {seconds}s / {MAX_RECORDING_SECONDS}s
        </div>
      )}

      {/* Confirmation card */}
      {state === "confirming" && pending && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 px-4 pb-6 sm:pb-0">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-full max-w-sm">
            <p className="text-xs font-semibold text-sky-600 mb-1.5 uppercase tracking-wide">Voice command</p>
            <p className="text-sm text-slate-900 mb-4">{pending.confirmation_text}</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-lg transition-all"
              >
                Confirm
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium py-2.5 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-[9.5rem] sm:bottom-24 left-1/2 -translate-x-1/2 z-50 text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg max-w-xs text-center ${
            toast.isError ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
