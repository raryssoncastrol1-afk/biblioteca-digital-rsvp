import React from 'react';
import { Play, Eye, Trash2, Bookmark } from 'lucide-react';

export function BookTable({ books, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  return (
    <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="px-6 py-3.5">Título</th>
            <th className="px-6 py-3.5">Autor</th>
            <th className="px-4 py-3.5">Formato</th>
            <th className="px-4 py-3.5">Palavras</th>
            <th className="px-6 py-3.5">Progresso</th>
            <th className="px-4 py-3.5">WPM</th>
            <th className="px-6 py-3.5 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {books.map(book => {
            const progress = book.progressPercent || 0;

            return (
              <tr key={book.id} className="hover:bg-slate-800/40 transition">
                <td className="px-6 py-4 font-semibold text-slate-100 max-w-xs truncate">
                  <span 
                    className="cursor-pointer hover:text-indigo-400 transition"
                    onClick={() => onOpenDetails && onOpenDetails(book.id)}
                  >
                    {book.title}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                  {book.author || '—'}
                </td>
                <td className="px-4 py-4">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {book.format}
                  </span>
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {(book.totalWords || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="font-mono text-xs text-slate-400">{progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs text-indigo-400">
                  {book.lastWpm || 350}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onOpenDetails && onOpenDetails(book.id)}
                      className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition"
                      title="Ver Detalhes & Índice"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenMiniPlayer(book.id)}
                      className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      title="Mini-Player"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenFullReader(book.id)}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                      title="Ler"
                    >
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir "${book.title}"?`)) onDelete(book.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                      title="Excluir"
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
