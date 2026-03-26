"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  accept: string;
  onUpload: (file: File) => Promise<{ rows?: number; entries?: number; filename?: string }>;
  description?: string;
}

export default function UploadZone({ label, accept, onUpload, description }: Props) {
  const [state, setState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setState("uploading");
    setMessage("");
    try {
      const result = await onUpload(file);
      const count = result.rows ?? result.entries ?? 0;
      setMessage(`Berhasil upload ${count.toLocaleString("id-ID")} ${result.rows !== undefined ? "baris" : "entri"}`);
      setState("success");
    } catch (err: any) {
      setMessage(err.message ?? "Upload gagal");
      setState("error");
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
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
          state === "success" && "border-emerald-300 bg-emerald-50",
          state === "error" && "border-red-300 bg-red-50"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
            <Loader2 size={24} className="text-indigo-500 animate-spin" />
          ) : state === "success" ? (
            <CheckCircle2 size={24} className="text-emerald-500" />
          ) : state === "error" ? (
            <AlertCircle size={24} className="text-red-500" />
          ) : (
            <Upload size={24} className="text-slate-400" />
          )}

          <div>
            <p className={cn(
              "text-sm font-medium",
              state === "success" ? "text-emerald-700" : state === "error" ? "text-red-700" : "text-slate-700"
            )}>
              {state === "uploading" ? "Mengupload..." : state === "success" ? message : state === "error" ? message : label}
            </p>
            {state === "idle" && description && (
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            )}
            {(state === "success" || state === "error") && (
              <button
                onClick={(e) => { e.stopPropagation(); setState("idle"); setMessage(""); }}
                className="text-xs text-indigo-600 hover:underline mt-1"
              >
                Upload lagi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
