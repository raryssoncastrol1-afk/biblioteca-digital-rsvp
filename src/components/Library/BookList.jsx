import React from 'react';
import { Play, Eye, Trash2, BookOpen, Bookmark } from 'lucide-react';
import { formatColors } from './BookCard.jsx';

export function BookList({ books, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  return (
    <div className="divide-y dark:divide-ink-800/60 divide-paper-200/60 border-b dark:border-ink-800/60 border-paper-200/60">
      {books.map(book => {
        const progress = book.progressPercent || 0;
        const estimatedMin = book.totalWords
          ? Math.ceil(book.totalWords / (book.lastWpm || 350))
          : null;
        const badgeClass = formatColors[book.format] || 'dark:bg-ink-700 dark:text-paper-300 bg-paper-100 text-ink-600';

        return (
          <div
            key={book.id}
            className="group flex items-center gap-4 px-1 py-3.5"
          >
            {/* Capa — proporção fixa 2:3 estilo Apple Books */}
            <div
              className="w-16 h-24 shrink-0 rounded-lg overflow-hidden dark:bg-ink-950 bg-paper-100 flex items-center justify-center cursor-pointer shadow-lg shadow-ink-950/40 ring-1 ring-ink-700/30 transition-transform group-hover:scale-[1.03]"
              onClick={() => onOpenDetails && onOpenDetails(book.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails && onOpenDetails(book.id); } }}
              aria-label={`Detalhes de ${book.title}`}
            >
              {book.coverDataUrl ? (
                <img src={book.coverDataUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-6 h-6 dark:text-ink-500 text-ink-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3
                  className="font-semibold text-[15px] dark:text-paper-50 text-ink-900 truncate cursor-pointer hover:text-brand-400 transition"
                  onClick={() => onOpenDetails && onOpenDetails(book.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(book.id); } }}
                >
                  {book.title}
                </h3>
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${badgeClass}`}>
                  {book.format}
                </span>
              </div>

              <p className="text-[13px] dark:text-paper-400 text-ink-500 truncate mt-0.5">
                {book.author || 'Autor Desconhecido'}
              </p>

              {/* Progresso — barra fina + % junto */}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-24 dark:bg-ink-800 bg-paper-200 rounded-full h-1 overflow-hidden shrink-0">
                  <div className="bg-brand-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[11px] font-mono dark:text-paper-400 text-ink-500 shrink-0">{progress}%</span>
                {estimatedMin && (
                  <span className="text-[11px] dark:text-paper-500 text-ink-400 truncate">
                    · {(book.totalWords || 0).toLocaleString()} pal. · ~{estimatedMin} min
                  </span>
                )}
              </div>
            </div>

            {/* Ações — discretas, alinhadas, estilo Apple */}
            <div className="shrink-0 flex items-center gap-0.5">
              <button
                onClick={() => onOpenMiniPlayer(book.id)}
                className="p-2 rounded-lg dark:text-ink-400 text-ink-500 dark:hover:text-paper-200 hover:text-ink-800 transition"
                title="Mini Player (Leitura Rápida)"
                aria-label={`Leitura rápida de ${book.title}`}
              >
                <Eye className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => onOpenFullReader(book.id)}
                className="flex items-center gap-1 px-1.5 py-2 text-[13px] font-semibold text-brand-400 hover:text-brand-300 transition"
                aria-label={progress > 0 ? `Continuar leitura de ${book.title}` : `Ler ${book.title}`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{progress > 0 ? 'Continuar' : 'Ler'}</span>
              </button>
              <button
                onClick={() => onDelete(book.id)}
                className="p-2 rounded-lg dark:text-ink-400 text-ink-500 dark:hover:text-red-400 hover:text-red-400 transition"
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