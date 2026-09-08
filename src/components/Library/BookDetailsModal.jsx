import React, { useState } from 'react';
import { 
  X, Play, BookOpen, Clock, FileText, Calendar, 
  Globe, Building2, CheckCircle2, Bookmark, BookText, Search
} from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';

export function BookDetailsModal({
  isOpen,
  onClose,
  book,
  chapters = [],
  onStartReadingFromChapter,
  onOpenFullReader
}) {
  const [searchTerm, setSearchTerm] = useState('');

  useEscapeKey(onClose);

  if (!isOpen || !book) return null;

  const progress = book.progressPercent || 0;
  const estimatedMin = Math.ceil((book.totalWords || 1000) / (book.lastWpm || 350));

  const filteredChapters = chapters.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Superior */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              {book.format}
            </span>
            <h2 className="text-base font-bold text-slate-100 truncate max-w-md">Metadados & Índice</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal em 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda: Capa e Metadados do Livro */}
          <div className="md:col-span-5 flex flex-col space-y-5">
            {/* Capa */}
            <div className="w-full aspect-[2/3] max-h-80 bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 relative group flex items-center justify-center">
              {book.coverDataUrl ? (
                <img 
                  src={book.coverDataUrl} 
                  alt={book.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                  <BookOpen className="w-16 h-16" />
                  <span className="text-xs font-mono">{book.format}</span>
                </div>
              )}
            </div>

            {/* Informações Básicas */}
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                {book.title}
              </h1>
              <p className="text-sm font-medium text-indigo-400">
                {book.author || 'Autor Desconhecido'}
              </p>
            </div>

            {/* Tabela de Metadados */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-500" /> Total de Palavras</span>
                <span className="font-mono text-slate-200">{(book.totalWords || 0).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> Tempo Estimado</span>
                <span className="font-mono text-slate-200">~{estimatedMin} min</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Bookmark className="w-3.5 h-3.5 text-slate-500" /> Seções / Capítulos</span>
                <span className="font-mono text-slate-200">{chapters.length}</span>
              </div>

              {book.publisher && (
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-500" /> Editora</span>
                  <span className="text-slate-200 truncate max-w-[150px]">{book.publisher}</span>
                </div>
              )}

              {book.publishedDate && (
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> Ano / Publicação</span>
                  <span className="text-slate-200">{book.publishedDate}</span>
                </div>
              )}

              {book.language && (
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-500" /> Idioma</span>
                  <span className="text-slate-200 uppercase">{book.language}</span>
                </div>
              )}
            </div>

            {/* Sinopse / Descrição (se houver) */}
            {book.description && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Sinopse</h4>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">
                  {book.description}
                </p>
              </div>
            )}

            {/* Botão de Ação de Leitura Principal */}
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenFullReader(book.id);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Iniciar Leitura RSVP</span>
              </button>
            </div>
          </div>

          {/* Coluna Direita: Sumário / Navegação pelo Índice */}
          <div className="md:col-span-7 flex flex-col bg-slate-950/50 rounded-2xl border border-slate-800/80 p-5 space-y-4">
            
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-indigo-400" />
                  <span>Índice do Livro</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Escolha qualquer capítulo para iniciar a leitura</p>
              </div>

              <span className="text-xs font-mono text-slate-500">
                {progress}% concluído
              </span>
            </div>

            {/* Campo de Busca do Índice */}
            {chapters.length > 6 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar capítulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Lista Interativa de Capítulos */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-96">
              {filteredChapters.length > 0 ? (
                filteredChapters.map((ch, idx) => {
                  const isCurrent = (book.currentWordIndex || 0) >= ch.startIndex && (book.currentWordIndex || 0) < ch.endIndex;
                  const isRead = (book.currentWordIndex || 0) >= ch.endIndex;
                  const chWords = Math.max(0, (ch.endIndex || 0) - (ch.startIndex || 0));
                  const chMin = Math.ceil(chWords / (book.lastWpm || 350));

                  return (
                    <div
                      key={ch.id || idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                        isCurrent 
                          ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200' 
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-slate-500 w-6 shrink-0 text-right">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold truncate text-slate-200">
                            {ch.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{chWords.toLocaleString()} palavras</span>
                            <span>•</span>
                            <span>~{chMin} min</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isRead && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" title="Capítulo Lido" />
                        )}

                        <button
                          onClick={() => {
                            onClose();
                            onStartReadingFromChapter(book.id, ch.startIndex);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1.5"
                          title="Ler este capítulo"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Ler</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Nenhum capítulo identificado.
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
