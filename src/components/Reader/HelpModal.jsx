import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';

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
    <kbd className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 border-b-2 text-[11px] font-mono text-slate-200 min-w-[22px] text-center inline-block whitespace-nowrap">
      {children}
    </kbd>
  );
}

export function HelpModal({ isOpen, onClose }) {
  useEscapeKey(onClose);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Atalhos do Leitor</h2>
              <p className="text-xs text-slate-400">Controle total sem tocar no mouse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-1">
          {SHORTCUTS.map(({ keys, desc }, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/50 transition"
            >
              <span className="text-sm text-slate-300">{desc}</span>
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-slate-600">+</span>}
                    <Kbd>{k}</Kbd>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
          Clique nas palavras destacadas para navegar com precisão durante a leitura.
        </div>
      </div>
    </div>
  );
}