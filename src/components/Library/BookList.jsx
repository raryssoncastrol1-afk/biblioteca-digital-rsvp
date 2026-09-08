import React from 'react';
import { Play, Eye, Trash2, FileText, Clock, BookOpen, Info, Bookmark } from 'lucide-react';

export function BookList({ books, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  return (
    <div className="space-y-3">
      {books.map(book => {
        const progress = book.progressPercent || 0;
        const estimatedMin = Math.ceil((book.totalWords || 1000) / (book.lastWpm || 350));

        return (
          <div 
            key={book.id}
            className="group flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 hover:bg-slate-850 transition"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Capa miniatura */}
              <div 
                className="w-14 h-20 bg-slate-950 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-800 cursor-pointer shadow"
                onClick={() => onOpenDetails && onOpenDetails(book.id)}
              >
                {book.coverDataUrl ? (
                  <img src={book.coverDataUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <BookOpen className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Informações */}
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {book.format}
                  </span>
                  <h3 
                    className="font-bold text-sm text-slate-100 truncate cursor-pointer hover:text-indigo-400 transition"
                    onClick={() => onOpenDetails && onOpenDetails(book.id)}
                  >
                    {book.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">{book.author || 'Autor Desconhecido'}</p>

                {/* Progresso visual */}
                <div className="flex items-center gap-4 mt-2 max-w-lg text-xs text-slate-400 flex-wrap">
                  <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden shrink-0">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{progress}%</span>
                  <span className="text-[11px] flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    {(book.totalWords || 0).toLocaleString()} palavras
                  </span>
                  <span className="text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    ~{estimatedMin} min
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => onOpenDetails && onOpenDetails(book.id)}
                className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition"
                title="Ver Detalhes & Índice"
              >
                <Bookmark className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenMiniPlayer(book.id)}
                className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
                title="Mini Player (Leitura Rápida)"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenFullReader(book.id)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Ler</span>
              </button>

              <button
                onClick={() => onDelete(book.id)}
                className="p-2.5 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800 transition"
                title="Excluir"
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
