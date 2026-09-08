import React, { useState, useCallback } from 'react';
import { parseDocument } from './services/parsers/index.js';
import { generateDynamicCover } from './services/parsers/coverGenerator.js';
import { getSetting, setSetting } from './services/db.js';
import { useBooks } from './hooks/useBooks.js';
import { LibraryView } from './components/Library/LibraryView.jsx';
import { RSVPReader } from './components/Reader/RSVPReader.jsx';
import { MiniPlayerModal } from './components/Library/MiniPlayerModal.jsx';
import { ChapterModal } from './components/Reader/ChapterModal.jsx';
import { SettingsModal } from './components/Reader/SettingsModal.jsx';
import { BookDetailsModal } from './components/Library/BookDetailsModal.jsx';
import { Toast } from './components/ui/Toast.jsx';

const DEFAULT_SETTINGS = {
  fontFamily: 'Atkinson Hyperlegible, sans-serif',
  fontSize: 48,
  theme: 'dark',
  accentColor: '#ef4444',
  adaptiveDwell: true,
  syntacticWrapup: true
};

export function App() {
  const { books, addBook, removeBook, updateProgress, loadBookWithDoc } = useBooks();
  const [activeBook, setActiveBook] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  const [miniBook, setMiniBook] = useState(null);
  const [miniDoc, setMiniDoc] = useState(null);

  const [detailsBook, setDetailsBook] = useState(null);
  const [detailsDoc, setDetailsDoc] = useState(null);

  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [seekIndex, setSeekIndex] = useState(null);
  const [seekNonce, setSeekNonce] = useState(0);

  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }

  const [settings, setAppSettings] = useState(DEFAULT_SETTINGS);

  // Carrega configurações do IndexedDB na inicialização
  React.useEffect(() => {
    getSetting('userSettings', DEFAULT_SETTINGS)
      .then((stored) => {
        if (stored) setAppSettings(stored);
      })
      .catch((err) => console.error('Erro ao carregar configurações:', err));
  }, []);

  // Atualiza configurações persistindo no IndexedDB
  const handleUpdateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setAppSettings(updated);
    await setSetting('userSettings', updated);
  };

  // Abre um livro no contexto informado (full reader, mini-player ou detalhes)
  const openBook = async (bookId, setters) => {
    try {
      const { book, doc } = await loadBookWithDoc(bookId) || {};
      if (book && doc) setters(book, doc);
    } catch (err) {
      console.error(`Erro ao abrir livro ${bookId}:`, err);
    }
  };

  // Abrir Leitor Completo
  const handleOpenFullReader = async (bookId, startingWordIndex = null) => {
    const open = async (book, doc) => {
      if (startingWordIndex !== null) {
        book.currentWordIndex = startingWordIndex;
        book.progressPercent = doc.tokens.length > 0 ? Math.min(100, Math.round((startingWordIndex / doc.tokens.length) * 100)) : 0;
        await updateProgress(bookId, startingWordIndex, doc.tokens.length, book.lastWpm);
      }
      setActiveBook(book);
      setActiveDoc(doc);
    };
    await openBook(bookId, open);
  };

  // Abrir Mini-Player Modal
  const handleOpenMiniPlayer = async (bookId) => {
    await openBook(bookId, (book, doc) => {
      setMiniBook(book);
      setMiniDoc(doc);
    });
  };

  // Abrir Modal de Detalhes & Índice
  const handleOpenDetails = async (bookId) => {
    await openBook(bookId, (book, doc) => {
      setDetailsBook(book);
      setDetailsDoc(doc);
    });
  };

  // Salvar Progresso
  const handleSaveProgress = useCallback(async (currentIndex, totalWords, wpm) => {
    if (!activeBook && !miniBook) return;
    const targetBook = activeBook || miniBook;
    const updated = await updateProgress(targetBook.id, currentIndex, totalWords, wpm);
    if (updated) {
      if (activeBook && activeBook.id === updated.id) setActiveBook(updated);
      if (miniBook && miniBook.id === updated.id) setMiniBook(updated);
      if (detailsBook && detailsBook.id === updated.id) setDetailsBook(updated);
    }
  }, [activeBook, miniBook, detailsBook, updateProgress]);

  // Excluir Livro
  const handleDeleteBook = async (bookId) => {
    try {
      await removeBook(bookId);
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

    let importedCount = 0;
    let failedCount = 0;

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

        await addBook(bookMetadata, docContent);
        importedCount++;
      } catch (err) {
        console.error(`Erro ao importar ${file.name}:`, err);
        failedCount++;
        setToast({ type: 'error', message: `Falha ao processar "${file.name}": ${err.message}` });
      }
    }

    setUploadProgress(100);
    setTimeout(() => {
      setIsProcessingUpload(false);
      setUploadProgress(0);
    }, 500);

    if (importedCount > 0) {
      setToast({
        type: 'success',
        message: `${importedCount} ${importedCount === 1 ? 'livro importado' : 'livros importados'}${failedCount > 0 ? ` (${failedCount} falha${failedCount > 1 ? 's' : ''})` : ''}.`
      });
    }
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

    await addBook(sampleMetadata, sampleDoc);
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
            setSeekIndex(null);
          }}
          onOpenChapters={() => setIsChaptersOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
          seekIndex={seekIndex}
          seekNonce={seekNonce}
        />

        <ChapterModal
          isOpen={isChaptersOpen}
          onClose={() => setIsChaptersOpen(false)}
          chapters={activeDoc.chapters}
          currentIndex={activeBook.currentWordIndex || 0}
          wpm={activeBook.lastWpm || 350}
          onSelectChapter={(index) => {
            setSeekIndex(index);
            setSeekNonce(n => n + 1);
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

      {/* Feedback de Importação */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}