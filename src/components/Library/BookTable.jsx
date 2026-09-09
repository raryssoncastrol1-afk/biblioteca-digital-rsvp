import React from 'react';
import { Play, Eye, Trash2, Bookmark } from 'lucide-react';
import { formatColors } from './BookCard.jsx';

export function BookTable({ books, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  return (
    <div className="overflow-x-auto dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 rounded-2xl">
      <table className="w-full text-left text-sm dark:text-paper-200 text-ink-800">
        <thead className="dark:bg-ink-900/60 bg-paper-50/60 text-xs uppercase tracking-wider dark:text-paper-400 text-ink-500 dark:border-ink-700 border-paper-200 border-b">
          <tr>
            <th className="px-6 py-3.5" scope="col">Título</th>
            <th className="px-6 py-3.5" scope="col">Autor</th>
            <th className="px-4 py-3.5" scope="col">Formato</th>
            <th className="px-4 py-3.5" scope="col">Palavras</th>
            <th className="px-6 py-3.5" scope="col">Progresso</th>
            <th className="px-4 py-3.5" scope="col">WPM</th>
            <th className="px-6 py-3.5 text-right" scope="col">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-ink-700/60 divide-paper-200/60">
          {books.map(book => {
            const progress = book.progressPercent || 0;
            const badgeClass = formatColors[book.format] || 'dark:bg-ink-700 dark:text-paper-300 bg-paper-100 text-ink-600';

            return (
              <tr key={book.id} className="dark:hover:bg-ink-800/50 hover:bg-paper-100/50 transition">
                <td className="px-6 py-4 font-semibold dark:text-paper-50 text-ink-900 max-w-xs truncate">
                  <span
                    className="cursor-pointer hover:text-brand-400 transition"
                    onClick={() => onOpenDetails && onOpenDetails(book.id)}
                  >
                    {book.title}
                  </span>
                </td>
                <td className="px-6 py-4 dark:text-paper-400 text-ink-500 max-w-xs truncate">
                  {book.author || '—'}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                    {book.format}
                  </span>
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {(book.totalWords || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-20 dark:bg-ink-800 bg-paper-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-brand-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="font-mono text-xs dark:text-paper-400 text-ink-500">{progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs dark:text-paper-200 text-ink-800">
                  {book.lastWpm || 350}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onOpenDetails && onOpenDetails(book.id)}
                      className="p-2.5 rounded-lg dark:border-ink-700 border-paper-200 dark:hover:bg-ink-800 hover:bg-paper-100 text-brand-400 hover:text-brand-300 transition"
                      title="Ver Detalhes & Índice"
                      aria-label={`Detalhes de ${book.title}`}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenMiniPlayer(book.id)}
                      className="p-2.5 rounded-lg dark:border-ink-700 border-paper-200 dark:hover:bg-ink-800 hover:bg-paper-100 dark:text-paper-400 text-ink-500 dark:hover:text-paper-200 hover:text-ink-800 transition"
                      title="Mini Player (Leitura Rápida)"
                      aria-label={`Leitura rápida de ${book.title}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenFullReader(book.id)}
                      className="p-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition"
                      title={progress > 0 ? 'Continuar leitura' : 'Ler'}
                      aria-label={progress > 0 ? `Continuar leitura de ${book.title}` : `Ler ${book.title}`}
                    >
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                    <button
                      onClick={() => onDelete(book.id)}
                      className="p-2.5 rounded-lg dark:text-paper-500 text-ink-400 hover:text-red-400 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
                      title="Excluir"
                      aria-label={`Excluir ${book.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}