import { useState, useEffect, useCallback } from 'react';
import {
  getAllBooks, getBookById, saveBook, deleteBook,
  updateBookProgress, saveDocumentContent, getDocumentContent
} from '../services/db.js';

/**
 * Hook para gestão centralizada do acervo: lista, persistência e progresso.
 */
export function useBooks() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    getAllBooks()
      .then(setBooks)
      .catch((err) => console.error('Erro ao carregar livros:', err));
  }, []);

  /** Adiciona um livro (metadados + conteúdo do documento). */
  const addBook = useCallback(async (bookMetadata, docContent) => {
    await saveBook(bookMetadata);
    await saveDocumentContent(bookMetadata.id, docContent);
    setBooks(prev => [bookMetadata, ...prev]);
  }, []);

  /** Exclui um livro completo (metadados + conteúdo). */
  const removeBook = useCallback(async (bookId) => {
    await deleteBook(bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
  }, []);

  /** Persiste o progresso de leitura e sincroniza a lista em memória. */
  const updateProgress = useCallback(async (bookId, currentIndex, totalWords, wpm) => {
    const updated = await updateBookProgress(bookId, currentIndex, totalWords, wpm);
    if (updated) {
      setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
    }
    return updated;
  }, []);

  /** Atualiza metadados e documento de um livro existente. */
  const updateBook = useCallback(async (bookMetadata, docContent) => {
    await saveBook(bookMetadata);
    if (docContent) {
      await saveDocumentContent(bookMetadata.id, docContent);
    }
    setBooks(prev => prev.map(b => b.id === bookMetadata.id ? bookMetadata : b));
  }, []);

  return { books, addBook, removeBook, updateProgress, updateBook, loadBookWithDoc };
}