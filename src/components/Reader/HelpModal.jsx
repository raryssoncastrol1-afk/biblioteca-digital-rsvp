import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

const SHORTCUTS = [
  { keys: ['Espaço'], desc: 'Iniciar / Pausar a leitura' },
  { keys: ['→', '←'], desc: 'Avançar / Voltar 10 palavras' },
  { keys: ['⇧', '→', '⇧', '←'], desc: 'Avançar / Voltar 1 palavra' },
  { keys: ['↑', '↓'], desc: 'Aumentar / Reduzir velocidade (+/−25 WPM)' },
  { keys: ['[', ']'], desc: 'Ir para capítulo anterior / próximo' },
  { keys: ['C'], desc: 'Abrir índice de capítulos' },
  { keys: ['S'], desc: 'Abrir configurações' },
  { keys: ['F'], desc: 'Alternar tela cheia' },
  { keys: ['R'], desc: 'Reiniciar a leitura do início' },
  { keys: ['H', '?'], desc: 'Abrir esta ajuda' },
  { keys: ['Esc'], desc: 'Fechar janelas e modais' }
];

function Kbd({ children }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md dark:bg-ink-800 dark:border-ink-700 bg-paper-100 border-paper-200 border border-b-2 text-[11px] font-mono dark:text-paper-200 text-ink-800 min-w-[22px] text-center inline-block whitespace-nowrap">
      {children}
    </kbd>
  );
}

export function HelpModal({ isOpen, onClose }) {
  const panelRef = useFocusTrap(isOpen);
  useEscapeKey(onClose);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm os-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-md dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] os-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 dark:border-b dark:border-ink-700 border-b border-paper-200 dark:bg-ink-950/60 bg-paper-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-base font-bold dark:text-paper-50 text-ink-900 font-display">Atalhos do Leitor</h2>
              <p className="text-xs dark:text-paper-400 text-ink-500">Controle total sem tocar no mouse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl dark:text-paper-400 text-ink-500 dark:hover:text-paper-50 hover:text-ink-900 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
            title="Fechar (Esc)"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-1">
          {SHORTCUTS.map(({ keys, desc }, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl dark:hover:bg-ink-800/50 hover:bg-paper-100/50 transition"
            >
              <span className="text-sm dark:text-paper-300 text-ink-600">{desc}</span>
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="dark:text-ink-500 text-paper-400">+</span>}
                    <Kbd>{k}</Kbd>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 dark:bg-ink-950 bg-paper-50 dark:border-t dark:border-ink-700 border-t border-paper-200 dark:text-paper-400 text-ink-500 text-xs">
          Clique nas palavras destacadas para navegar com precisão durante a leitura.
        </div>
      </div>
    </div>
  );
}