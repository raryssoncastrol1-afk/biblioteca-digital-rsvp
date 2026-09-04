import React, { useState, useMemo } from 'react';
import { X, BookOpen, CheckCircle, Search, Clock, ChevronRight } from 'lucide-react';

export function ChapterModal({ isOpen, onClose, chapters = [], currentIndex = 0, onSelectChapter, wpm = 350 }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChapters = useMemo(() => {
    if (!searchTerm.trim()) return chapters;
    return chapters.filter(ch => ch.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [chapters, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Índice & Navegação</h2>
              <p className="text-xs text-slate-400">Total de {chapters.length} seções / capítulos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Busca de Capítulos */}
        {chapters.length > 5 && (
          <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nome do capítulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Lista de Capítulos */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-800/30">
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
                      ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-200 font-semibold shadow-inner' 
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono text-slate-500 w-7 shrink-0 text-right">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm group-hover:text-indigo-300 transition">
                        {ch.title}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
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
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500 text-white font-medium shadow">
                        Lendo
                      </span>
                    )}
                    {!isCurrent && !isRead && (
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition" />
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhum capítulo encontrado para "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Clique em qualquer capítulo para saltar diretamente</span>
          <span className="font-mono">Teclado: [ ] para avançar/voltar</span>
        </div>
      </div>
    </div>
  );
}
