import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, List, Table2, Search, Upload, BookOpen, 
  Sparkles, Library
} from 'lucide-react';
import { BookCard } from './BookCard.jsx';
import { BookList } from './BookList.jsx';
import { BookTable } from './BookTable.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

export function LibraryView({
  books,
  onOpenFullReader,
  onOpenMiniPlayer,
  onOpenDetails,
  onDeleteBook,
  onImportFiles,
  onLoadSampleBook,
  isProcessingUpload,
  uploadProgress
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // book aguardando confirmação

  // Filtros de formato agrupados (7 formatos suportados → 5 grupos, evitando sobrecarga de decisão)
  const formatGroups = [
    { id: 'ALL', label: 'Todos' },
    { id: 'EPUB', label: 'EPUB' },
    { id: 'PDF', label: 'PDF' },
    { id: 'DOCX', label: 'DOCX' },
    { id: 'TEXT', label: 'Texto (TXT/MD)' },
    { id: 'EBOOK', label: 'Ebook (MOBI/AZW3)' }
  ];

  // Filtros
  const filteredBooks = useMemo(() => {
    const matchesFormat = (format) => {
      if (selectedFormat === 'ALL') return true;
      switch (selectedFormat) {
        case 'TEXT':
          return format === 'TXT' || format === 'MD';
        case 'EBOOK':
          return format === 'MOBI' || format === 'AZW3';
        default:
          return format === selectedFormat;
      }
    };

    return books.filter(b => {
      const matchQuery = 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchFormat = matchesFormat(b.format);

      return matchQuery && matchFormat;
    });
  }, [books, searchQuery, selectedFormat]);

  // Estatísticas da Estante
  const totalWordsInLibrary = books.reduce((acc, b) => acc + (b.totalWords || 0), 0);

  // WPM médio conta apenas leituras reais (não-padrão), não livros nunca lidos
  const readBooks = books.filter(b => (b.progressPercent || 0) > 0);
  const avgWpm = readBooks.length > 0
    ? Math.round(readBooks.reduce((acc, b) => acc + (b.lastWpm || 350), 0) / readBooks.length)
    : null;

  // "Continuar lendo": livro em andamento tocado por último
  const continueBook = books
    .filter(b => (b.progressPercent || 0) > 0 && (b.progressPercent || 0) < 100)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  const allRead = books.length > 0 && readBooks.length === books.length;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFormat('ALL');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
    }
  };

  // Solicita exclusão: abre o diálogo de confirmação estilizado com o livro alvo
  const handleRequestDelete = (bookId) => {
    const book = books.find(b => b.id === bookId);
    if (book) setPendingDelete(book);
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Indicador visual de Drag & Drop */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 dark:bg-ink-900/85 bg-paper-100/85 backdrop-blur-sm border-4 border-dashed border-brand-400 flex flex-col items-center justify-center pointer-events-none os-fade-in">
          <Upload className="w-16 h-16 text-brand-300 animate-pulse" />
          <h2 className="text-2xl font-bold dark:text-paper-50 text-ink-900 mt-4">Solte seus arquivos aqui</h2>
          <p className="text-brand-200 mt-1">Formatos suportados: EPUB, PDF, DOCX, TXT, MOBI, AZW3</p>
        </div>
      )}

      {/* Header Superior */}
      <header className="border-b dark:border-ink-700/80 border-paper-200/80 dark:bg-ink-900/60 bg-white/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/25">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight dark:text-paper-50 text-ink-900 font-display">
                RSVP FOCUS
              </h1>
              <p className="text-[11px] dark:text-paper-400 text-ink-500 font-medium">Biblioteca Digital & Leitor Cognitivo</p>
            </div>
          </div>

          {/* Ações de Importação */}
          <div className="flex items-center gap-3">
            <button
              onClick={onLoadSampleBook}
              className="flex items-center gap-2 px-3.5 py-2 dark:bg-ink-800 dark:hover:bg-ink-700 dark:text-paper-300 bg-paper-100 hover:bg-paper-200 text-ink-600 dark:border-ink-700 border-paper-200 rounded-xl text-xs font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Carregar Clássico Demo</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Importar Arquivo</span>
              <input 
                type="file" 
                multiple 
                accept=".epub,.pdf,.docx,.txt,.md,.mobi,.azw3" 
                onChange={handleFileInput} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </header>

      {/* Status de Processamento / Upload */}
      {isProcessingUpload && (
        <div className="bg-brand-600/15 border-b border-brand-500/30 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-brand-200">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              Extraindo e processando documento no cliente...
            </span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Resumo da Estante (uma linha, sem competir com os livros) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 rounded-2xl dark:bg-ink-900/60 bg-white/60 dark:border-ink-700/80 border-paper-200/80 text-xs sm:text-sm dark:text-paper-400 text-ink-500">
          <p className="min-w-0">
            <span className="font-semibold dark:text-paper-200 text-ink-800">{books.length}</span> {books.length === 1 ? 'livro' : 'livros'}
            <span className="mx-2 dark:text-ink-600 text-paper-300">·</span>
            <span className="font-semibold dark:text-paper-200 text-ink-800">{totalWordsInLibrary.toLocaleString()}</span> palavras no acervo
            {avgWpm && (
              <>
                <span className="mx-2 dark:text-ink-600 text-paper-300">·</span>
                <span className="font-semibold dark:text-paper-200 text-ink-800">{avgWpm} WPM</span> em leitura
              </>
            )}
          </p>
          <p className="truncate max-w-full sm:max-w-md dark:text-paper-500 text-ink-400">
            {continueBook
              ? <span>Continue de <span className="text-brand-400 font-medium">{continueBook.title}</span> · {continueBook.progressPercent}%</span>
              : allRead && books.length > 0
                ? 'Tudo lido por aqui — que tal mais um?'
                : 'Importe um arquivo para começar sua leitura acelerada'}
          </p>
        </div>

        {/* Barra de Filtros, Pesquisa e Modos de Visualização */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 dark:bg-ink-900/60 bg-white/60 dark:border-ink-700/80 border-paper-200/80 rounded-2xl">
          
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
            <Search className="w-4 h-4 dark:text-paper-400 text-ink-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar livros"
              className="w-full pl-10 pr-4 py-2 dark:bg-ink-950/80 dark:border-ink-700 bg-paper-50 border-paper-200 rounded-xl text-xs sm:text-sm dark:text-paper-200 text-ink-800 dark:placeholder-paper-500 placeholder-ink-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de Formato */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              aria-label="Filtrar por formato"
              className="dark:bg-ink-800 bg-paper-100 dark:border-ink-700 border-paper-200 rounded-lg px-3 py-1.5 text-xs dark:text-paper-200 text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {formatGroups.map(fg => (
                <option key={fg.id} value={fg.id}>{fg.label}</option>
              ))}
            </select>

            {/* Alternador de visualização: Grade, Lista, Tabela */}
            <div className="flex items-center dark:bg-ink-800 bg-paper-100 p-1 rounded-xl dark:border-ink-700 border-paper-200" role="group" aria-label="Modo de visualização">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Modo Grade"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'dark:bg-ink-700 bg-paper-200 text-brand-400' : 'dark:text-paper-500 text-ink-400 dark:hover:text-paper-300 hover:text-ink-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="Modo Lista"
                aria-pressed={viewMode === 'list'}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'dark:bg-ink-700 bg-paper-200 text-brand-400' : 'dark:text-paper-500 text-ink-400 dark:hover:text-paper-300 hover:text-ink-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                aria-label="Modo Tabela"
                aria-pressed={viewMode === 'table'}
                className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'dark:bg-ink-700 bg-paper-200 text-brand-400' : 'dark:text-paper-500 text-ink-400 dark:hover:text-paper-300 hover:text-ink-600'}`}
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Listagem de Livros */}
        {filteredBooks.length === 0 ? (
          books.length === 0 ? (
            /* Estante vazia: onboarding — explica como começar */
            <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed dark:border-ink-700 border-paper-200 rounded-3xl p-8">
              <BookOpen className="w-16 h-16 dark:text-ink-600 text-paper-400 mb-4" />
              <h3 className="text-lg font-bold dark:text-paper-300 text-ink-600">Sua estante está vazia</h3>
              <p className="text-sm dark:text-paper-500 text-ink-400 max-w-sm mt-1">
                Importe um EPUB, PDF ou DOCX e comece a ler palavras por vez com o ritmo que você escolher. Sem conexão, sem nuvem — tudo fica no seu dispositivo.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={onLoadSampleBook}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl dark:border-ink-700 border-paper-200 dark:bg-ink-800/60 dark:hover:bg-ink-800 dark:text-paper-200 bg-paper-100 hover:bg-paper-200 text-ink-800 text-xs font-semibold transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Ver obra de exemplo
                </button>
                <button
                  onClick={() => document.getElementById('library-file-input')?.click()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition"
                >
                  Importar arquivo
                </button>
              </div>
              <label className="hidden">
                <input id="library-file-input" type="file" multiple accept=".epub,.pdf,.docx,.txt,.md,.mobi,.azw3" onChange={handleFileInput} />
              </label>
            </div>
          ) : (
            /* Busca/filtro sem resultados: recovery correto, com "limpar filtros" */
            <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed dark:border-ink-700 border-paper-200 rounded-3xl p-8">
              <Search className="w-12 h-12 dark:text-ink-600 text-paper-400 mb-4" />
              <h3 className="text-lg font-bold dark:text-paper-300 text-ink-600">
                Nada encontrado{searchQuery ? ` para “${searchQuery}”` : ''}
              </h3>
              <p className="text-sm dark:text-paper-500 text-ink-400 max-w-sm mt-1">
                {selectedFormat !== 'ALL'
                  ? 'Tente outro termo ou ajuste o filtro de formato.'
                  : 'Confira a ortografia ou use um termo mais curto.'}
              </p>
              {(searchQuery || selectedFormat !== 'ALL') && (
                <button
                  onClick={clearFilters}
                  className="mt-6 px-4 py-2 dark:bg-ink-800 dark:hover:bg-ink-700 dark:text-paper-200 bg-paper-100 hover:bg-paper-200 text-ink-800 rounded-xl text-xs font-semibold transition"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBooks.map(book => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpenFullReader={onOpenFullReader}
                    onOpenMiniPlayer={onOpenMiniPlayer}
                    onOpenDetails={onOpenDetails}
                    onDelete={handleRequestDelete}
                  />
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <BookList
                books={filteredBooks}
                onOpenFullReader={onOpenFullReader}
                onOpenMiniPlayer={onOpenMiniPlayer}
                onOpenDetails={onOpenDetails}
                onDelete={handleRequestDelete}
              />
            )}

            {viewMode === 'table' && (
              <BookTable
                books={filteredBooks}
                onOpenFullReader={onOpenFullReader}
                onOpenMiniPlayer={onOpenMiniPlayer}
                onOpenDetails={onOpenDetails}
                onDelete={handleRequestDelete}
              />
            )}
          </>
        )}

      </main>

      {/* Rodapé informativo */}
      <footer className="border-t dark:border-ink-800 border-paper-200 py-6 text-center text-xs dark:text-paper-500 text-ink-400">
        RSVP Focus • Leitura acelerada por fixação foveal &nbsp;·&nbsp; Tudo offline, direto do seu dispositivo
      </footer>

      {/* Diálogo de Confirmação de Exclusão */}
      {pendingDelete && (
        <ConfirmDialog
          title="Excluir livro?"
          message={`"${pendingDelete.title}" de ${pendingDelete.author || 'Autor Desconhecido'} será removido permanentemente da sua estante, incluindo o progresso de leitura.`}
          confirmLabel="Excluir"
          onConfirm={() => {
            onDeleteBook(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
