import React from 'react';
import { Play, Eye, Trash2, FileText, BookOpen, Clock, Info, Bookmark } from 'lucide-react';

export function BookCard({ book, onOpenFullReader, onOpenMiniPlayer, onOpenDetails, onDelete }) {
  const formatColors = {
    PDF: 'bg-red-500/20 text-red-400 border-red-500/30',
    EPUB: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    DOCX: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    TXT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    MD: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    MOBI: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    AZW3: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
  };

  const badgeClass = formatColors[book.format] || 'bg-slate-700 text-slate-300';
  const progress = book.progressPercent || 0;
  const estimatedMin = Math.ceil((book.totalWords || 1000) / (book.lastWpm || 350));

  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition flex flex-col justify-between">
      
      {/* Top Capa / Preview */}
      <div className="relative h-48 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
        {book.coverDataUrl ? (
          <img 
            src={book.coverDataUrl} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
            <BookOpen className="w-12 h-12" />
            <span className="text-xs uppercase tracking-wider font-semibold">{book.format}</span>
          </div>
        )}

        {/* Badge de formato */}
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass} backdrop-blur-xs`}>
          {book.format}
        </span>

        {/* Ação rápida de exclusão */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(book.id);
          }}
          className="absolute top-3 right-3 p-2.5 rounded-lg bg-slate-900/80 text-slate-400 hover:text-red-400 hover:bg-slate-900 transition opacity-0 group-hover:opacity-100 hover-reveal"
          title="Excluir livro"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Overlay com Botões Rápidos (sempre visível em telas touch via .hover-reveal) */}
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 hover-reveal transition duration-200">
          {/* Ação primária: maior e mais destacada (Von Restorff) */}
          <button
            onClick={() => onOpenFullReader(book.id)}
            className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/40 transition transform hover:scale-110 active:scale-95"
            title="Abrir Leitor Completo"
          >
            <Play className="w-6 h-6 fill-white" />
          </button>
          <button
            onClick={() => onOpenMiniPlayer(book.id)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl shadow transition transform hover:scale-105 active:scale-95"
            title="Mini Player (Leitura Rápida)"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => onOpenDetails && onOpenDetails(book.id)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl shadow transition transform hover:scale-105 active:scale-95"
            title="Ver Detalhes & Índice"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info do Livro */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 
            className="font-bold text-sm text-slate-100 line-clamp-1 cursor-pointer hover:text-indigo-400 transition" 
            title={book.title}
            onClick={() => onOpenDetails && onOpenDetails(book.id)}
          >
            {book.title}
          </h3>
          <p className="text-xs text-slate-400 truncate mt-0.5">{book.author || 'Autor Desconhecido'}</p>
        </div>

        <div className="mt-4 space-y-2.5">
          {/* Métricas */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{(book.totalWords || 0).toLocaleString()} pal.</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>~{estimatedMin} min</span>
            </span>
            <button
              onClick={() => onOpenDetails && onOpenDetails(book.id)}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              title="Ver Índice"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Índice</span>
            </button>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{progress}% lido</span>
              <span>{book.lastWpm || 350} WPM</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}