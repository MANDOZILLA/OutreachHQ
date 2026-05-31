"use client";

import { createContext, useCallback, useContext, useState, useRef, ReactNode } from "react";
import { IconCheck } from "@tabler/icons-react";

type ToastFn = (msg: string) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<ToastFn>((m) => {
    setMsg(m);
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2400);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast ${show ? "show" : ""}`}>
        <IconCheck size={16} className="text-green" />
        <span>{msg}</span>
      </div>
    </ToastContext.Provider>
  );
}
