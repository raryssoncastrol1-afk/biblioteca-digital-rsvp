import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAllBooks, saveBook, getBookById, deleteBook, 
  updateBookProgress, saveDocumentContent, getDocumentContent,
  getSetting, setSetting
} from './services/db.js';
import { parseDocument } from './services/parsers/index.js';
import { generateDynamicCover } from './services/parsers/coverGenerator.js';
import { LibraryView } from './components/Library/LibraryView.jsx';
import { RSVPReader } from './components/Reader/RSVPReader.jsx';
import { MiniPlayerModal } from './components/Library/MiniPlayerModal.jsx';
import { ChapterModal } from './components/Reader/ChapterModal.jsx';
import { SettingsModal } from './components/Reader/SettingsModal.jsx';
import { BookDetailsModal } from './components/Library/BookDetailsModal.jsx';

const DEFAULT_SETTINGS = {
  fontFamily: 'Atkinson Hyperlegible, sans-serif',
  fontSize: 48,
  theme: 'dark',
  accentColor: '#ef4444',
  adaptiveDwell: true,
  syntacticWrapup: true
};

export function App() {
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  const [miniBook, setMiniBook] = useState(null);
  const [miniDoc, setMiniDoc] = useState(null);

  const [detailsBook, setDetailsBook] = useState(null);
  const [detailsDoc, setDetailsDoc] = useState(null);

  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [settings, setAppSettings] = useState(DEFAULT_SETTINGS);

  // Carrega livros e configurações do IndexedDB na inicialização
  useEffect(() => {
    async function init() {
      try {
        const storedBooks = await getAllBooks();
        setBooks(storedBooks);

        const storedSettings = await getSetting('userSettings', DEFAULT_SETTINGS);
        if (storedSettings) {
          setAppSettings(storedSettings);
        }
      } catch (err) {
        console.error('Erro ao inicializar IndexedDB:', err);
      }
    }
    init();
  }, []);

  // Atualiza configurações persistindo no IndexedDB
  const handleUpdateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setAppSettings(updated);
    await setSetting('userSettings', updated);
  };

  // Abrir Leitor Completo
  const handleOpenFullReader = async (bookId, startingWordIndex = null) => {
    try {
      const book = await getBookById(bookId);
      const doc = await getDocumentContent(bookId);
      if (book && doc) {
        if (startingWordIndex !== null) {
          book.currentWordIndex = startingWordIndex;
          book.progressPercent = doc.tokens.length > 0 ? Math.min(100, Math.round((startingWordIndex / doc.tokens.length) * 100)) : 0;
          await updateBookProgress(bookId, startingWordIndex, doc.tokens.length, book.lastWpm);
        }
        setActiveBook(book);
        setActiveDoc(doc);
      }
    } catch (err) {
      console.error('Erro ao abrir leitor:', err);
    }
  };

  // Abrir Mini-Player Modal
  const handleOpenMiniPlayer = async (bookId) => {
    try {
      const book = await getBookById(bookId);
      const doc = await getDocumentContent(bookId);
      if (book && doc) {
        setMiniBook(book);
        setMiniDoc(doc);
      }
    } catch (err) {
      console.error('Erro ao abrir mini-player:', err);
    }
  };

  // Abrir Modal de Detalhes & Índice
  const handleOpenDetails = async (bookId) => {
    try {
      const book = await getBookById(bookId);
      const doc = await getDocumentContent(bookId);
      if (book && doc) {
        setDetailsBook(book);
        setDetailsDoc(doc);
      }
    } catch (err) {
      console.error('Erro ao abrir detalhes:', err);
    }
  };

  // Salvar Progresso
  const handleSaveProgress = useCallback(async (currentIndex, totalWords, wpm) => {
    if (!activeBook && !miniBook) return;
    const targetBook = activeBook || miniBook;
    try {
      const updated = await updateBookProgress(targetBook.id, currentIndex, totalWords, wpm);
      if (updated) {
        setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
        if (activeBook && activeBook.id === updated.id) setActiveBook(updated);
        if (miniBook && miniBook.id === updated.id) setMiniBook(updated);
        if (detailsBook && detailsBook.id === updated.id) setDetailsBook(updated);
      }
    } catch (err) {
      console.error('Erro ao salvar progresso:', err);
    }
  }, [activeBook, miniBook, detailsBook]);

  // Excluir Livro
  const handleDeleteBook = async (bookId) => {
    try {
      await deleteBook(bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (activeBook && activeBook.id === bookId) {
        setActiveBook(null);
        setActiveDoc(null);
      }
      if (miniBook && miniBook.id === bookId) {
        setMiniBook(null);
        setMiniDoc(null);
      }
      if (detailsBook && detailsBook.id === bookId) {
        setDetailsBook(null);
        setDetailsDoc(null);
      }
    } catch (err) {
      console.error('Erro ao deletar livro:', err);
    }
  };

  // Importar Arquivos
  const handleImportFiles = async (fileList) => {
    setIsProcessingUpload(true);
    setUploadProgress(10);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        setUploadProgress(Math.round(((i + 0.2) / fileList.length) * 90));
        const parsed = await parseDocument(file, (p) => setUploadProgress(p));

        const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const bookMetadata = {
          id: bookId,
          title: parsed.title || file.name.replace(/\.[^/.]+$/, ""),
          author: parsed.author || 'Autor Desconhecido',
          description: parsed.description || '',
          publisher: parsed.publisher || '',
          publishedDate: parsed.publishedDate || '',
          language: parsed.language || 'pt',
          isbn: parsed.isbn || '',
          subjects: parsed.subjects || [],
          format: parsed.format,
          totalWords: parsed.totalWords || parsed.words.length,
          coverDataUrl: parsed.coverDataUrl || null,
          progressPercent: 0,
          currentWordIndex: 0,
          lastWpm: 350,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const docContent = {
          tokens: parsed.words,
          chapters: parsed.chapters || [],
          rawText: parsed.rawText
        };

        await saveBook(bookMetadata);
        await saveDocumentContent(bookId, docContent);

        setBooks(prev => [bookMetadata, ...prev]);
      } catch (err) {
        console.error(`Erro ao importar ${file.name}:`, err);
        alert(`Falha ao processar o arquivo ${file.name}: ${err.message}`);
      }
    }

    setUploadProgress(100);
    setTimeout(() => {
      setIsProcessingUpload(false);
      setUploadProgress(0);
    }, 500);
  };

  // Carregar Livro Clássico de Exemplo (Dom Casmurro de Machado de Assis)
  const handleLoadSampleBook = async () => {
    setIsProcessingUpload(true);
    setUploadProgress(50);

    const sampleText = `
Capítulo 1 - Do Título
Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que não fossem inteiramente maus. Sucedeu, porém, que, como eu estava cansado, fechei os olhos três ou quatro vezes; tanto bastou para que ele interrompesse a leitura e metesse os versos no bolso.

— Continue, disse eu abrindo os olhos.
— Já acabei, murmurou ele.
— São muito bonitos.

Vi-lhe fazer um gesto de incredulidade. No dia seguinte entrou a dizer de mim nomes feios, e acabou alcunhando-me Dom Casmurro. Os vizinhos, que não gostam dos meus hábitos reclusos e calados, deram curso à alcunha, que afinal pegou. Nem por isso me zanguei. Contei a anedota aos amigos da cidade, e eles, por graça, chamam-me assim, alguns em cartas: "Dom Casmurro, domingo vou jantar com você." — "Vou para Petrópolis, Dom Casmurro; a casa é a mesma da Renânia; vê se deixas essa caverna do Engenho Novo, e vai lá passar uns quinze dias comigo." — "Meu caro Dom Casmurro, não cuide que o dispenso do teatro amanhã; venha e dormirá aqui na cidade; dou-lhe camarote, dou-lhe chá, dou-lhe cama; só não lhe dou moça."

Não consultes dicionários. Casmurro não está aqui no sentido que eles lhe dão, mas no que lhe pôs o vulgo de homem calado e metido consigo. Dom veio por ironia, para atribuir-me fumos de fidalgo. Tudo por estar cochilando! Também não achei melhor título para a minha narração; se não tiver outro daqui até ao fim do livro, vai este mesmo. O meu fim evidente era atar as duas pontas da vida, e restaurar na velhice a adolescência. Pois, senhor, não consegui recompor o que foi nem o que fui. Em tudo, se o rosto é igual, a fisionomia é diferente. Se só me faltassem os outros, vá; um homem consola-se mais ou menos das pessoas que perde; mas falto eu mesmo, e esta lacuna é tudo. O que aqui está é, mal comparando, semelhante à pintura que se põe na barba e nos cabelos, e que apenas conserva o hábito externo, como se diz nas boticas; o interno já não quer nada com tinta.

Capítulo 2 - Do Livro
Agora que expliquei o título, passo a escrever o livro. Antes disso, porém, digamos os motivos que me põem a pena na mão. Vivo só, com um criado. A casa em que moro é própria; fiz construí-la de propósito, no Engenho Novo, imitando a que morei na infância, na antiga Rua de Matacavalos. Quis reproduzir a mesma habitação, as mesmas árvores e o mesmo jardim, com as flores que me lembravam os velhos tempos.

Capítulo 3 - Da Promessa
Ia esquecendo dizer que este Engenho Novo era então um arrabalde quase despovoado; não havia bondes, e a iluminação a gás estava ainda nas promessas da companhia concessionária. Mas a solidão era propícia às minhas memórias e ao projeto de recapitular a vida inteira.
    `.trim();

    const words = sampleText.split(/\s+/).filter(Boolean);
    const bookId = 'sample_dom_casmurro_' + Date.now();

    const sampleCover = generateDynamicCover('Dom Casmurro', 'Machado de Assis', 'EPUB');

    const sampleMetadata = {
      id: bookId,
      title: 'Dom Casmurro (Amostra Literária)',
      author: 'Machado de Assis',
      description: 'Uma das obras-primas da literatura brasileira e do Realismo, narrada sob a perspectiva psicológica e irônica de Bento Santiago.',
      publisher: 'Livraria Garnier',
      publishedDate: '1899',
      language: 'pt',
      isbn: '978-85-359-0277-8',
      subjects: ['Literatura Brasileira', 'Realismo', 'Clássicos'],
      format: 'EPUB',
      totalWords: words.length,
      coverDataUrl: sampleCover,
      progressPercent: 0,
      currentWordIndex: 0,
      lastWpm: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const sampleDoc = {
      tokens: words,
      chapters: [
        { id: 'ch-1', title: 'Capítulo 1 - Do Título', startIndex: 0, endIndex: 380 },
        { id: 'ch-2', title: 'Capítulo 2 - Do Livro', startIndex: 380, endIndex: 450 },
        { id: 'ch-3', title: 'Capítulo 3 - Da Promessa', startIndex: 450, endIndex: words.length }
      ],
      rawText: sampleText
    };

    await saveBook(sampleMetadata);
    await saveDocumentContent(bookId, sampleDoc);

    setBooks(prev => [sampleMetadata, ...prev]);
    setIsProcessingUpload(false);
    setUploadProgress(0);
  };

  // Se estiver lendo em tela cheia no modo RSVP
  if (activeBook && activeDoc) {
    return (
      <>
        <RSVPReader
          book={activeBook}
          tokens={activeDoc.tokens}
          chapters={activeDoc.chapters}
          initialIndex={activeBook.currentWordIndex || 0}
          onSaveProgress={handleSaveProgress}
          onBackToLibrary={() => {
            setActiveBook(null);
            setActiveDoc(null);
          }}
          onOpenChapters={() => setIsChaptersOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
        />

        <ChapterModal
          isOpen={isChaptersOpen}
          onClose={() => setIsChaptersOpen(false)}
          chapters={activeDoc.chapters}
          currentIndex={activeBook.currentWordIndex || 0}
          wpm={activeBook.lastWpm || 350}
          onSelectChapter={(index) => {
            handleSaveProgress(index, activeDoc.tokens.length, activeBook.lastWpm);
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </>
    );
  }

  // Visualização Padrão: Estante Digital
  return (
    <>
      <LibraryView
        books={books}
        onOpenFullReader={handleOpenFullReader}
        onOpenMiniPlayer={handleOpenMiniPlayer}
        onOpenDetails={handleOpenDetails}
        onDeleteBook={handleDeleteBook}
        onImportFiles={handleImportFiles}
        onLoadSampleBook={handleLoadSampleBook}
        isProcessingUpload={isProcessingUpload}
        uploadProgress={uploadProgress}
      />

      {/* Modal de Detalhes & Índice */}
      {detailsBook && detailsDoc && (
        <BookDetailsModal
          isOpen={!!detailsBook}
          onClose={() => {
            setDetailsBook(null);
            setDetailsDoc(null);
          }}
          book={detailsBook}
          chapters={detailsDoc.chapters || []}
          onStartReadingFromChapter={(bookId, startIdx) => {
            setDetailsBook(null);
            setDetailsDoc(null);
            handleOpenFullReader(bookId, startIdx);
          }}
          onOpenFullReader={(bookId) => {
            setDetailsBook(null);
            setDetailsDoc(null);
            handleOpenFullReader(bookId);
          }}
        />
      )}

      {/* Mini-Player RSVP Modal */}
      {miniBook && miniDoc && (
        <MiniPlayerModal
          isOpen={!!miniBook}
          onClose={() => {
            setMiniBook(null);
            setMiniDoc(null);
          }}
          book={miniBook}
          tokens={miniDoc.tokens}
          chapters={miniDoc.chapters || []}
          initialIndex={miniBook.currentWordIndex || 0}
          onOpenFull={(bookId) => {
            setMiniBook(null);
            setMiniDoc(null);
            handleOpenFullReader(bookId);
          }}
          onSaveProgress={handleSaveProgress}
          settings={settings}
        />
      )}
    </>
  );
}
