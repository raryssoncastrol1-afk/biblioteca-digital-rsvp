import React from 'react';
import { Play, Eye, Trash2, FileText, Clock, BookOpen, Bookmark } from 'lucide-react';
import { formatColors } from './BookCard.jsx';

export function BookList({ books, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  return (
    <div className="space-y-3">
      {books.map(book => {
        const progress = book.progressPercent || 0;
        const estimatedMin = book.totalWords
          ? Math.ceil(book.totalWords / (book.lastWpm || 350))
          : null;
        const badgeClass = formatColors[book.format] || 'dark:bg-ink-700 dark:text-paper-300 bg-paper-100 text-ink-600';

        return (
          <div
            key={book.id}
            className="group flex items-center justify-between p-4 dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 rounded-2xl hover:border-brand-500/40 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Capa miniatura */}
              <div
                className="w-14 h-20 dark:bg-ink-950 bg-paper-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center dark:border-ink-700 border-paper-200 cursor-pointer shadow focus-visible:ring-2 focus-visible:ring-brand-400"
                onClick={() => onOpenDetails && onOpenDetails(book.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails && onOpenDetails(book.id); } }}
                aria-label={`Detalhes de ${book.title}`}
              >
                {book.coverDataUrl ? (
                  <img src={book.coverDataUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <BookOpen className="w-6 h-6 dark:text-ink-500 text-paper-400" />
                )}
              </div>

              {/* Informações */}
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                    {book.format}
                  </span>
                  <h3
                    className="font-bold text-sm dark:text-paper-50 text-ink-900 truncate cursor-pointer hover:text-brand-400 transition focus-visible:text-brand-400"
                    onClick={() => onOpenDetails && onOpenDetails(book.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(book.id); } }}
                  >
                    {book.title}
                  </h3>
                </div>
                <p className="text-xs dark:text-paper-400 text-ink-500 mt-1">{book.author || 'Autor Desconhecido'}</p>

                {/* Progresso visual */}
                <div className="flex items-center gap-4 mt-2 max-w-lg text-xs dark:text-paper-400 text-ink-500 flex-wrap">
                  <div className="w-28 dark:bg-ink-800 bg-paper-200 rounded-full h-1.5 overflow-hidden shrink-0">
                    <div className="bg-brand-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[11px] font-mono dark:text-paper-500 text-ink-400">{progress}%</span>
                  <span className="text-[11px] flex items-center gap-1">
                    <FileText className="w-3 h-3 dark:text-paper-500 text-ink-400" />
                    {(book.totalWords || 0).toLocaleString()} palavras
                  </span>
                  {estimatedMin && (
                    <span className="text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 dark:text-paper-500 text-ink-400" />
                      ~{estimatedMin} min
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => onOpenDetails && onOpenDetails(book.id)}
                className="p-2.5 rounded-xl dark:border-ink-700 border-paper-200 dark:hover:bg-ink-800 hover:bg-paper-100 text-brand-400 hover:text-brand-300 transition"
                title="Ver Detalhes & Índice"
                aria-label={`Detalhes de ${book.title}`}
              >
                <Bookmark className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenMiniPlayer(book.id)}
                className="p-2.5 rounded-xl dark:border-ink-700 border-paper-200 dark:hover:bg-ink-800 hover:bg-paper-100 dark:text-paper-300 text-ink-600 transition"
                title="Mini Player (Leitura Rápida)"
                aria-label={`Leitura rápida de ${book.title}`}
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenFullReader(book.id)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow transition"
                aria-label={progress > 0 ? `Continuar leitura de ${book.title}` : `Ler ${book.title}`}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{progress > 0 ? 'Continuar' : 'Ler'}</span>
              </button>

              <button
                onClick={() => onDelete(book.id)}
                className="p-2.5 dark:text-paper-500 text-ink-400 hover:text-red-400 rounded-xl dark:hover:bg-ink-800 hover:bg-paper-100 transition"
                title="Excluir"
                aria-label={`Excluir ${book.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}