import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

/**
 * Diálogo de confirmação estilizado (substitui confirm() nativo).
 * Fecha com Esc ou clique no backdrop.
 */
export function ConfirmDialog({ title = 'Confirmar ação', message, confirmLabel = 'Excluir', onConfirm, onCancel }) {
  const panelRef = useFocusTrap(true);
  useEscapeKey(onCancel);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm os-fade-in"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 rounded-2xl shadow-2xl overflow-hidden os-sheet-in"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
              <TriangleAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="confirm-dialog-title" className="font-bold dark:text-paper-50 text-ink-900">{title}</h3>
              <p className="text-sm dark:text-paper-400 text-ink-500 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3.5 dark:bg-ink-950/60 bg-paper-50/60 dark:border-t dark:border-ink-700 border-t border-paper-200">
          <button
            onClick={onCancel}
            autoFocus
            className="px-4 py-2.5 rounded-xl dark:border-ink-700 border-paper-200 dark:text-paper-300 text-ink-600 dark:hover:bg-ink-800 hover:bg-paper-100 text-sm font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-600/30 transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}