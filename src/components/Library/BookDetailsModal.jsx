import React, { useState } from 'react';
import { 
  X, Play, BookOpen, Clock, FileText, Calendar, 
  Globe, Building2, CheckCircle2, Bookmark, BookText, Search
} from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export function BookDetailsModal({
  isOpen,
  onClose,
  book,
  chapters = [],
  onStartReadingFromChapter,
  onOpenFullReader
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const panelRef = useFocusTrap(isOpen);

  useEscapeKey(onClose);

  if (!isOpen || !book) return null;

  const progress = book.progressPercent || 0;
  const estimatedMin = Math.ceil((book.totalWords || 1000) / (book.lastWpm || 350));

  const filteredChapters = chapters.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
<div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md os-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-details-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-4xl dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] os-sheet-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle do Bottom-Sheet (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full dark:bg-ink-600 bg-paper-300" />
        </div>
        {/* Header Superior */}
        <div className="flex items-center justify-between px-6 py-4 dark:border-ink-700 border-paper-200 dark:border-b border-b dark:bg-ink-950/80 bg-paper-50/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30">
              {book.format}
            </span>
            <h2 id="book-details-title" className="text-base font-bold dark:text-paper-50 text-ink-900 truncate max-w-md font-display">Metadados & Índice</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl dark:text-paper-400 text-ink-500 dark:hover:text-paper-50 hover:text-ink-900 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal em 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda: Capa e Metadados do Livro */}
          <div className="md:col-span-5 flex flex-col space-y-5">
            {/* Capa */}
            <div className="w-full aspect-[2/3] max-h-80 dark:bg-ink-950 bg-paper-50 rounded-2xl overflow-hidden shadow-xl dark:border-ink-700 border-paper-200 border relative group flex items-center justify-center">
              {book.coverDataUrl ? (
                <img 
                  src={book.coverDataUrl} 
                  alt={book.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center dark:text-ink-500 text-paper-400 gap-2">
                  <BookOpen className="w-16 h-16" />
                  <span className="text-xs font-mono">{book.format}</span>
                </div>
              )}
            </div>

            {/* Informações Básicas */}
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-black dark:text-paper-50 text-ink-900 leading-snug font-display">
                {book.title}
              </h1>
              <p className="text-sm font-medium text-brand-400">
                {book.author || 'Autor Desconhecido'}
              </p>
            </div>

            {/* Tabela de Metadados */}
            <div className="p-4 rounded-2xl dark:bg-ink-950/70 bg-paper-50/70 dark:border-ink-700/80 border-paper-200/80 border space-y-2.5 text-xs">
              <div className="flex items-center justify-between dark:text-paper-400 text-ink-500">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 dark:text-paper-500 text-ink-400" /> Total de Palavras</span>
                <span className="font-mono dark:text-paper-200 text-ink-800">{(book.totalWords || 0).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between dark:text-paper-400 text-ink-500">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 dark:text-paper-500 text-ink-400" /> Tempo Estimado</span>
                <span className="font-mono dark:text-paper-200 text-ink-800">~{estimatedMin} min</span>
              </div>

              <div className="flex items-center justify-between dark:text-paper-400 text-ink-500">
                <span className="flex items-center gap-1.5"><Bookmark className="w-3.5 h-3.5 dark:text-paper-500 text-ink-400" /> Seções / Capítulos</span>
                <span className="font-mono dark:text-paper-200 text-ink-800">{chapters.length}</span>
              </div>

              {book.publisher && (
                <div className="flex items-center justify-between dark:text-paper-400 text-ink-500">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 dark:text-paper-500 text-ink-400" /> Editora</span>
                  <span className="dark:text-paper-200 text-ink-800 truncate max-w-[150px]">{book.publisher}</span>
                </div>
              )}

              {book.publishedDate && (
                <div className="flex items-center justify-between dark:text-paper-400 text-ink-500">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 dark:text-paper-500 text-ink-400" /> Ano / Publicação</span>
                  <span className="dark:text-paper-200 text-ink-800">{book.publishedDate}</span>
                </div>
              )}

              {book.language && (
                <div className="flex items-center justify-between dark:text-paper-400 text-ink-500">
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 dark:text-paper-500 text-ink-400" /> Idioma</span>
                  <span className="dark:text-paper-200 text-ink-800 uppercase">{book.language}</span>
                </div>
              )}
            </div>

            {/* Sinopse / Descrição (se houver) */}
            {book.description && (
              <div className="p-4 rounded-2xl dark:bg-ink-950/40 bg-paper-50/40 dark:border-ink-700/60 border-paper-200/60 border">
                <h4 className="text-xs font-bold dark:text-paper-300 text-ink-600 uppercase tracking-wider mb-1">Sinopse</h4>
                <p className="text-xs dark:text-paper-400 text-ink-500 leading-relaxed line-clamp-4">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Iniciar Leitura RSVP</span>
              </button>
            </div>
          </div>

          {/* Coluna Direita: Sumário / Navegação pelo Índice */}
          <div className="md:col-span-7 flex flex-col dark:bg-ink-950/50 bg-paper-50/50 rounded-2xl dark:border-ink-700/80 border-paper-200/80 border p-5 space-y-4">
            
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold dark:text-paper-50 text-ink-900 flex items-center gap-2 font-display">
                  <Bookmark className="w-4 h-4 text-brand-400" />
                  <span>Índice do Livro</span>
                </h3>
                <p className="text-xs dark:text-paper-400 text-ink-500 mt-0.5">Escolha qualquer capítulo para iniciar a leitura</p>
              </div>

              <span className="text-xs font-mono dark:text-paper-500 text-ink-400">
                {progress}% concluído
              </span>
            </div>

            {/* Campo de Busca do Índice */}
            {chapters.length > 6 && (
              <div className="relative">
                <Search className="w-4 h-4 dark:text-paper-400 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar capítulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 dark:bg-ink-950 dark:border-ink-700 bg-paper-50 border-paper-200 border rounded-xl text-xs dark:text-paper-200 text-ink-800 dark:placeholder-paper-500 placeholder-ink-400 focus:outline-none focus:border-brand-500"
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
                          ? 'bg-brand-600/15 border-brand-500/50 text-brand-200' 
                          : 'dark:bg-ink-900/60 bg-white/60 dark:border-ink-700/80 border-paper-200/80 dark:hover:border-ink-600 hover:border-paper-300 dark:text-paper-300 text-ink-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono dark:text-paper-500 text-ink-400 w-6 shrink-0 text-right">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold truncate dark:text-paper-200 text-ink-800">
                            {ch.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] dark:text-paper-500 text-ink-400 mt-0.5">
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
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1.5"
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
                <div className="text-center py-10 dark:text-paper-500 text-ink-400 text-xs">
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
