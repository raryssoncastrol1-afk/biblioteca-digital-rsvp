import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * Toast global para feedback de sucesso/erro (substitui alert() nativo).
 * Auto-descarta após 4s ou ao clicar no X.
 */
export function Toast({ type = 'success', message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = type === 'error';
  const containerClass = isError
    ? 'border-red-500/40 bg-slate-950/95 text-red-200'
    : 'border-emerald-500/40 bg-slate-950/95 text-emerald-100';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm ${containerClass}`}
      role="status"
    >
      {isError
        ? <XCircle className="w-5 h-5 shrink-0 text-red-400" />
        : <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />}
      <p className="text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={onDismiss}
        className="ml-1 p-1 rounded-lg hover:bg-white/10 text-current/70 transition shrink-0"
        title="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}