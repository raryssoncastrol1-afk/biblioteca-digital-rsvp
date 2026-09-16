/**
 * Degrau 3 da cascata: recupera metadados a partir do nome do arquivo.
 * Padrões: "Autor - Título (Ano).pdf", "Título (ISBN).epub".
 *
 * ponytail: assume convenção "Autor - Título" (autor vem primeiro). Para acervos que
 * nomeiam como "Título - Autor", trocar a ordem aqui — por ora mantém o padrão mais comum.
 */

function normalizeIsbn(raw) {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9Xx]/g, '');
  if (digits.length === 10 || digits.length === 13) return digits.toUpperCase().replace(/X$/, 'X');
  return '';
}

export function parseMetadataFromFilename(filename) {
  let name = String(filename || '').replace(/\.[^/.]+$/, '').trim();
  const out = { title: name, author: '', year: '', isbn: '' };

  if (!name) return out;

  // Ano em parênteses/colchetes: (1899), [2020]
  const yearMatch = name.match(/[\(\[]\s*(1[89]\d{2}|20\d{2})\s*[\)\]]/);
  if (yearMatch) {
    out.year = yearMatch[1];
    name = name.replace(yearMatch[0], ' ');
  }

  // ISBN em parênteses/colchetes: (ISBN 978-85-7322-000-7), (9788572320007)
  const isbnMatch = name.match(/[\(\[]\s*(?:isbn[\s:=-]*)?([0-9][0-9Xx\s-]{8,20})\s*[\)\]]/i);
  if (isbnMatch) {
    const candidate = normalizeIsbn(isbnMatch[1]);
    if (candidate) {
      out.isbn = candidate;
      name = name.replace(isbnMatch[0], ' ');
    }
  }

  // "Autor - Título" (separador " - "), caso contrário só limpa separadores fracos
  const parts = name.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    out.author = parts[0];
    name = parts.slice(1).join(' — ');
  }

  out.title = name
    .replace(/[_]+/g, ' ')
    .replace(/[,.#]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || out.title;

  if (out.title === String(filename || '').replace(/\.[^/.]+$/, '').trim()) {
    out.title = out.title.replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  return out;
}