import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';

/**
 * Diálogo de confirmação estilizado (substitui confirm() nativo).
 * Fecha com Esc ou clique no backdrop.
 */
export function ConfirmDialog({ title = 'Confirmar ação', message, confirmLabel = 'Excluir', onConfirm, onCancel }) {
  useEscapeKey(onCancel);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
              <TriangleAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-100">{title}</h3>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3.5 bg-slate-950/60 border-t border-slate-800">
          <button
            onClick={onCancel}
            autoFocus
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
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