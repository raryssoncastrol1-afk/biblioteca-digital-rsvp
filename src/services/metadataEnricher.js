/**
 * Serviço de Enriquecimento de Metadados e Capas
 * Utiliza a API pública e aberta Open Library (CORS-friendly, sem chave de API necessária)
 */

/**
 * Converte uma URL de imagem remota em Data URL (base64) para persistência offline no IndexedDB
 */
async function imageUrlToDataUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Limpa strings de título removendo extensões, números de versão, etc.
 */
function cleanQueryString(str) {
  if (!str) return '';
  return str
    .replace(/\.[^/.]+$/, '') // remove extensão
    .replace(/[\[\(].*?[\]\)]/g, '') // remove [epub], (2020), etc.
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca metadados e capas na Open Library
 * 
 * @param {Object} bookData - { title, author, isbn }
 * @returns {Promise<Object|null>}
 */
export async function enrichBookMetadata({ title, author, isbn }) {
  const cleanTitle = cleanQueryString(title);
  if (!cleanTitle || cleanTitle.length < 2) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    let queryUrl = '';
    if (isbn) {
      queryUrl = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`;
    } else {
      let queryParam = `title=${encodeURIComponent(cleanTitle)}`;
      if (author && author !== 'Autor Desconhecido') {
        const cleanAuthor = cleanQueryString(author);
        queryParam += `&author=${encodeURIComponent(cleanAuthor)}`;
      }
      queryUrl = `https://openlibrary.org/search.json?${queryParam}&limit=1`;
    }

    const response = await fetch(queryUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();

    if (!data.docs || data.docs.length === 0) return null;

    const doc = data.docs[0];

    // Capa da Open Library (Média ou Grande)
    let coverDataUrl = null;
    if (doc.cover_i) {
      const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      coverDataUrl = await imageUrlToDataUrl(coverUrl);
    }

    return {
      enrichedTitle: doc.title || null,
      enrichedAuthor: doc.author_name ? doc.author_name[0] : null,
      publisher: doc.publisher ? doc.publisher[0] : null,
      publishYear: doc.first_publish_year || (doc.publish_year ? doc.publish_year[0] : null),
      language: doc.language ? doc.language[0] : null,
      isbn: doc.isbn ? doc.isbn[0] : null,
      subjects: doc.subject ? doc.subject.slice(0, 5) : [],
      coverDataUrl
    };
  } catch (err) {
    // Falha silenciosa em caso de offline / timeout
    return null;
  }
}
