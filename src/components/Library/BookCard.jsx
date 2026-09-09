import React from 'react';
import { Play, Eye, Trash2, BookOpen, Clock, Info, Bookmark } from 'lucide-react';

export const formatColors = {
  PDF: 'bg-red-500/20 text-red-400 border-red-500/30',
  EPUB: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  DOCX: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TXT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  MD: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  MOBI: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  AZW3: 'bg-brand-500/20 text-brand-400 border-brand-500/30'
};

export function BookCard({ book, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  const badgeClass = formatColors[book.format] || 'dark:bg-ink-700 dark:text-paper-300 bg-paper-100 text-ink-600';
  const progress = book.progressPercent || 0;
  const estimatedMin = book.totalWords
    ? Math.ceil(book.totalWords / (book.lastWpm || 350))
    : null;

  return (
    <div className="group relative dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 rounded-2xl overflow-hidden hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10 transition flex flex-col justify-between">

      {/* Top Capa / Preview */}
      <div className="relative h-48 dark:bg-ink-950 bg-paper-50 flex items-center justify-center overflow-hidden border-b dark:border-ink-700 border-paper-200">
        {book.coverDataUrl ? (
          <img
            src={book.coverDataUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center dark:text-ink-500 text-paper-400 gap-2">
            <BookOpen className="w-12 h-12" />
            <span className="text-xs uppercase tracking-wider font-semibold">{book.format}</span>
          </div>
        )}

        {/* Badge de formato */}
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass} backdrop-blur-sm`}>
          {book.format}
        </span>

        {/* Ação rápida de exclusão */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(book.id);
          }}
          className="absolute top-3 right-3 p-2.5 rounded-lg dark:bg-ink-900/80 bg-white/80 dark:text-paper-400 text-ink-500 hover:text-red-400 dark:hover:bg-ink-900 hover:bg-white transition opacity-0 group-hover:opacity-100 hover-reveal focus-visible:opacity-100"
          title="Excluir livro"
          aria-label={`Excluir ${book.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Barra de ações: "Ler/Continuar" sempre visível; ações secundárias em hover/touch */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2.5 bg-gradient-to-t dark:from-ink-950/95 dark:via-ink-950/75 from-paper-50/95 via-paper-50/75 to-transparent">
          <button
            onClick={() => onOpenFullReader(book.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 transition transform active:scale-95"
            aria-label={progress > 0 ? `Continuar leitura de ${book.title}` : `Ler ${book.title}`}
          >
            <Play className="w-3.5 h-3.5 fill-white shrink-0" />
            <span>{progress > 0 ? 'Continuar' : 'Ler'}</span>
            {progress > 0 && (
              <span className="text-[10px] font-mono font-semibold opacity-80">{progress}%</span>
            )}
          </button>

          <button
            onClick={() => onOpenMiniPlayer(book.id)}
            className="p-2 dark:bg-ink-800/80 dark:hover:bg-ink-700 dark:text-paper-200 bg-paper-100/80 hover:bg-paper-200 text-ink-800 rounded-xl shadow transition opacity-0 group-hover:opacity-100 hover-reveal focus-visible:opacity-100"
            title="Mini Player (Leitura Rápida)"
            aria-label={`Leitura rápida de ${book.title}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenDetails && onOpenDetails(book.id)}
            className="p-2 dark:bg-ink-800/80 dark:hover:bg-ink-700 dark:text-paper-200 bg-paper-100/80 hover:bg-paper-200 text-ink-800 rounded-xl shadow transition opacity-0 group-hover:opacity-100 hover-reveal focus-visible:opacity-100"
            title="Ver Detalhes & Índice"
            aria-label={`Detalhes de ${book.title}`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info do Livro */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className="font-bold text-sm dark:text-paper-50 text-ink-900 line-clamp-1 cursor-pointer hover:text-brand-400 transition focus-visible:text-brand-400"
            title={book.title}
            tabIndex={0}
            role="button"
            onClick={() => onOpenDetails && onOpenDetails(book.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(book.id); }}}
          >
            {book.title}
          </h3>
          <p className="text-xs dark:text-paper-400 text-ink-500 truncate mt-0.5">{book.author || 'Autor Desconhecido'}</p>
        </div>

        <div className="mt-4 space-y-2.5">
          {/* Métricas */}
          <div className="flex items-center justify-between text-[11px] dark:text-paper-400 text-ink-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{(book.totalWords || 0).toLocaleString()} pal.</span>
            </span>
            {estimatedMin && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>~{estimatedMin} min</span>
              </span>
            )}
            <button
              onClick={() => onOpenDetails && onOpenDetails(book.id)}
              className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium"
              title="Ver Índice"
              aria-label={`Índice de ${book.title}`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Índice</span>
            </button>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1">
            <div className="w-full dark:bg-ink-800 bg-paper-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] dark:text-paper-500 text-ink-400 font-mono">
              <span>{progress}% lido</span>
              <span>{book.lastWpm || 350} WPM</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}