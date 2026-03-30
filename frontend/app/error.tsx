"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <p className="text-red-400 text-sm font-medium tracking-widest uppercase mb-2">Error</p>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Terjadi kesalahan</h1>
      <p className="text-slate-500 text-sm max-w-xs mb-8">
        Sesuatu yang tidak terduga terjadi. Coba lagi atau hubungi administrator.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono mb-6 bg-slate-100 px-3 py-1.5 rounded-lg">
          ID: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button onClick={reset} className="btn-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          Coba Lagi
        </button>
        <a href="/" className="btn-secondary">Ke Dashboard</a>
      </div>
    </div>
  );
}
