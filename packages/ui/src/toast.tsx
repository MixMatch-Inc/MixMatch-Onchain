"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const COLORS: Record<ToastKind, string> = {
  success: "var(--mm-color-success, #15803d)",
  error: "var(--mm-color-danger, #b91c1c)",
  info: "var(--mm-color-info, #1d4ed8)",
};

/**
 * Toast provider and viewport. Messages are announced through a live region: errors use `role="alert"`
 * (assertive), success and info use `role="status"` (polite). Toasts dismiss themselves after `durationMs`.
 */
export function ToastProvider({ children, durationMs = 5000 }: { children: ReactNode; durationMs?: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
    },
    [dismiss, durationMs],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ show, success: (m) => show("success", m), error: (m) => show("error", m), info: (m) => show("info", m) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" style={{ position: "fixed", right: 16, bottom: 16, display: "grid", gap: 8, zIndex: 1100 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            style={{ background: COLORS[toast.kind], color: "#fff", padding: "8px 12px", borderRadius: "var(--mm-radius-md, 8px)", display: "flex", gap: 8, alignItems: "center" }}
          >
            <span>{toast.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} style={{ background: "transparent", color: "inherit", border: 0, cursor: "pointer" }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
