import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, List, Table2, Search, Upload, BookOpen, 
  Sparkles, CheckCircle2, Zap
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
  const avgWpm = books.length > 0 
    ? Math.round(books.reduce((acc, b) => acc + (b.lastWpm || 350), 0) / books.length) 
    : 350;

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
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Indicador visual de Drag & Drop */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-indigo-900/80 backdrop-blur-sm border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <Upload className="w-16 h-16 text-indigo-300 animate-bounce" />
          <h2 className="text-2xl font-bold text-white mt-4">Solte seus arquivos aqui</h2>
          <p className="text-indigo-200 mt-1">Formatos suportados: EPUB, PDF, DOCX, TXT, MOBI, AZW3</p>
        </div>
      )}

      {/* Header Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                RSVP FOCUS
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Biblioteca Digital & Leitor Cognitivo</p>
            </div>
          </div>

          {/* Ações de Importação */}
          <div className="flex items-center gap-3">
            <button
              onClick={onLoadSampleBook}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Carregar Clássico Demo</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer transition">
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
        <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-indigo-200">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Extraindo e processando documento no cliente...
            </span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Banner de Estatísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total de Livros</p>
              <h3 className="text-2xl font-black text-slate-100 mt-0.5">{books.length}</h3>
            </div>
            <BookOpen className="w-8 h-8 text-indigo-500/40" />
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Palavras no Acervo</p>
              <h3 className="text-2xl font-black text-slate-100 mt-0.5">{totalWordsInLibrary.toLocaleString()}</h3>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Velocidade Média</p>
              <h3 className="text-2xl font-black text-indigo-400 mt-0.5">{avgWpm} <span className="text-xs font-normal text-slate-500">WPM</span></h3>
            </div>
            <Zap className="w-8 h-8 text-amber-500/40" />
          </div>
        </div>

        {/* Barra de Filtros, Pesquisa e Modos de Visualização */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de Formato */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
              {formatGroups.map(fg => (
                <button
                  key={fg.id}
                  onClick={() => setSelectedFormat(fg.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    selectedFormat === fg.id 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fg.label}
                </button>
              ))}
            </div>

            {/* Alternador de visualização: Grade, Lista, Tabela */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Modo Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Modo Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Modo Tabela"
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Listagem de Livros */}
        {filteredBooks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-800 rounded-3xl p-8">
            <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Nenhum livro encontrado</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Arraste e solte arquivos EPUB, PDF ou DOCX aqui, ou clique no botão abaixo para carregar um texto de demonstração.
            </p>
            <button
              onClick={onLoadSampleBook}
              className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition"
            >
              Carregar Obra de Exemplo
            </button>
          </div>
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
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Biblioteca Digital & Leitor RSVP Focus • Arquitetura Offline-First (IndexedDB) • WebAssembly OCR
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
