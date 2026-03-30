"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  accept: string;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<{ rows?: number; entries?: number; filename?: string }>;
  description?: string;
}

export default function UploadZone({ label, accept, onUpload, description }: Props) {
  const [state, setState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setState("uploading");
    setProgress(0);
    setMessage(`${(file.size / 1024 / 1024).toFixed(1)} MB`);

    try {
      const result = await onUpload(file, setProgress);
      const count = result.rows ?? result.entries ?? 0;
      setMessage(
        `Berhasil upload ${count.toLocaleString("id-ID")} ${result.rows !== undefined ? "baris" : "entri"}`
      );
      setState("success");
      setProgress(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      setMessage(msg);
      setState("error");
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200",
          state === "idle" || state === "error" ? "cursor-pointer" : "cursor-default",
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
          state === "uploading" && "border-indigo-300 bg-indigo-50/50",
          state === "success" && "border-emerald-300 bg-emerald-50",
          state === "error" && "border-red-300 bg-red-50"
        )}
        onClick={() => (state === "idle" || state === "error") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (state === "idle") setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <div className="flex flex-col items-center gap-2">
          {state === "uploading" ? (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-medium text-indigo-600">
                  {progress < 100 ? `Mengupload ${message}` : "Memproses data..."}
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    progress < 100 ? "bg-indigo-500" : "bg-indigo-400 animate-pulse"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : state === "success" ? (
            <>
              <CheckCircle2 size={24} className="text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-700">{message}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setState("idle"); setMessage(""); setProgress(0); }}
                  className="text-xs text-indigo-600 hover:underline mt-1"
                >
                  Upload lagi
                </button>
              </div>
            </>
          ) : state === "error" ? (
            <>
              <AlertCircle size={24} className="text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">{message}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setState("idle"); setMessage(""); }}
                  className="text-xs text-indigo-600 hover:underline mt-1"
                >
                  Coba lagi
                </button>
              </div>
            </>
          ) : (
            <>
              <Upload size={24} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
