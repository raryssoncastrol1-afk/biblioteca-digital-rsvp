import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * Toast global para feedback de sucesso/erro (substitui alert() nativo).
 * Auto-descarta após 4s, pausa com hover/foco, ou ao clicar no X.
 */
export function Toast({ type = 'success', message, onDismiss }) {
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(onDismiss, 4000);
  };

  useEffect(() => {
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDismiss, message, type]);

  const isError = type === 'error';
  const containerClass = isError
    ? 'border-red-500/40 dark:bg-ink-900/95 bg-white/95 dark:text-red-200 text-red-700'
    : 'border-emerald-500/40 dark:bg-ink-900/95 bg-white/95 dark:text-emerald-100 text-emerald-700';

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl os-sheet-in max-w-sm mx-auto sm:mx-0 ${containerClass}`}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      onFocus={clearTimer}
      onBlur={startTimer}
    >
      {isError
        ? <XCircle className="w-5 h-5 shrink-0 text-red-400" />
        : <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />}
      <p className="text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={onDismiss}
        className="ml-1 p-1 rounded-lg hover:bg-white/10 text-current/70 transition shrink-0"
        title="Fechar"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}