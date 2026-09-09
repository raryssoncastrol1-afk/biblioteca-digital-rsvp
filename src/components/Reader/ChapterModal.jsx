import React, { useState, useMemo } from 'react';
import { X, BookOpen, CheckCircle, Search, Clock, ChevronRight } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export function ChapterModal({ isOpen, onClose, chapters = [], currentIndex = 0, onSelectChapter, wpm = 350 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const panelRef = useFocusTrap(isOpen);

  useEscapeKey(onClose);

  const filteredChapters = useMemo(() => {
    if (!searchTerm.trim()) return chapters;
    return chapters.filter(ch => ch.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [chapters, searchTerm]);

  if (!isOpen) return null;

  return (
<div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm os-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-modal-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden dark:border-ink-700 border-paper-200 dark:bg-ink-900 bg-white dark:text-paper-50 text-ink-900 border flex flex-col max-h-[85vh] os-sheet-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle do Bottom-Sheet (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full dark:bg-ink-600 bg-paper-300" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 dark:border-ink-700 border-paper-200 dark:border-b border-b dark:bg-ink-950/60 bg-paper-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="chapter-modal-title" className="text-base font-bold dark:text-paper-50 text-ink-900 font-display">Índice & Navegação</h2>
              <p className="text-xs dark:text-paper-400 text-ink-500">Total de {chapters.length} seções / capítulos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl dark:text-paper-400 text-ink-500 dark:hover:text-paper-50 hover:text-ink-900 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Busca de Capítulos */}
        {chapters.length > 5 && (
          <div className="px-6 py-3 dark:border-b dark:border-ink-700/80 border-b border-paper-200/80 dark:bg-ink-900/40 bg-paper-100/40">
            <div className="relative">
              <Search className="w-4 h-4 dark:text-paper-400 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nome do capítulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 dark:bg-ink-950 dark:border-ink-700 bg-paper-50 border-paper-200 border rounded-xl text-xs dark:text-paper-200 text-ink-800 dark:placeholder-paper-500 placeholder-ink-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        )}

        {/* Lista de Capítulos */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y dark:divide-ink-700/30 divide-paper-200/30">
          {filteredChapters.length > 0 ? (
            filteredChapters.map((ch, idx) => {
              const isCurrent = currentIndex >= ch.startIndex && currentIndex < ch.endIndex;
              const isRead = currentIndex >= ch.endIndex;
              const chapterWords = Math.max(0, (ch.endIndex || 0) - (ch.startIndex || 0));
              const chapterMinutes = Math.ceil(chapterWords / (wpm || 350));

              return (
                <button
                  key={ch.id || idx}
                  onClick={() => {
                    onSelectChapter(ch.startIndex);
                    onClose();
                  }}
                   className={`w-full text-left p-3.5 rounded-xl flex items-center justify-between gap-3 transition group ${
                    isCurrent 
                      ? 'bg-brand-600/20 border border-brand-500/50 text-brand-200 font-semibold shadow-inner' 
                      : 'dark:hover:bg-ink-800/60 hover:bg-paper-100/60 dark:text-paper-300 text-ink-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono dark:text-paper-500 text-ink-400 w-7 shrink-0 text-right">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm group-hover:text-brand-300 transition">
                        {ch.title}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] dark:text-paper-500 text-ink-400 mt-0.5">
                        <span>{chapterWords.toLocaleString()} palavras</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{chapterMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isRead && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Lido
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-600 text-white font-medium shadow">
                        Lendo
                      </span>
                    )}
                    {!isCurrent && !isRead && (
                      <ChevronRight className="w-4 h-4 dark:text-ink-500 text-paper-400 dark:group-hover:text-paper-400 group-hover:text-ink-500 group-hover:translate-x-0.5 transition" />
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 dark:text-paper-400 text-ink-500 text-sm">
              Nenhum capítulo encontrado para "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 dark:bg-ink-950 bg-paper-50 dark:border-t dark:border-ink-700 border-t border-paper-200 dark:text-paper-400 text-ink-500 text-xs flex items-center justify-between">
          <span>Clique em qualquer capítulo para saltar diretamente</span>
          <span className="font-mono">Teclado: [ ] para avançar/voltar</span>
        </div>
      </div>
    </div>
  );
}
