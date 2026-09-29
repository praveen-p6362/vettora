import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastKind = 'good' | 'warn' | 'bad' | 'info';
interface ToastItem { id: number; message: string; kind: ToastKind; }

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

const COLORS: Record<ToastKind, string> = { good: '#059669', warn: '#D97706', bad: '#DC2626', info: '#0F172A' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: COLORS[t.kind], flexShrink: 0 }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
