"use client";

import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };
type ToastFn = (message: string, type?: ToastType) => void;

const ToastCtx = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

let _globalToast: ToastFn = () => {};
export function toast(message: string, type: ToastType = "info") {
  _globalToast(message, type);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter.current;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => { _globalToast = addToast; }, [addToast]);

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };
  const styles: Record<ToastType, string> = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    error:   "border-red-500/30 bg-red-500/10 text-red-300",
    info:    "border-blue-500/30 bg-blue-500/10 text-blue-200",
  };

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm backdrop-blur-md shadow-xl max-w-xs animate-in slide-in-from-right-4 fade-in duration-200 ${styles[t.type]}`}>
            <span className="font-bold text-base leading-none">{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
