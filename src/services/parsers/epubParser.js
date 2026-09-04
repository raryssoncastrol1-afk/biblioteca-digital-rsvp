import JSZip from 'jszip';

/**
 * Parser avançado para livros digitais EPUB (EPUB 2 e EPUB 3)
 * Extrai metadados completos, capa de alta fidelidade e árvore de índice (TOC).
 */
export async function parseEpubFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Localizar o container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('EPUB inválido: META-INF/container.xml não encontrado.');
  }

  const parser = new DOMParser();
  const containerXml = await containerFile.async('text');
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path') || 'content.opf';

  // 2. Ler o arquivo OPF
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`EPUB inválido: arquivo OPF ${opfPath} não encontrado.`);
  }

  const opfBaseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfXml = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Metadados Estendidos
  const title = opfDoc.querySelector('title, dc\\:title')?.textContent?.trim() || file.name.replace(/\.[^/.]+$/, "");
  const author = opfDoc.querySelector('creator, dc\\:creator')?.textContent?.trim() || 'Autor Desconhecido';
  const description = opfDoc.querySelector('description, dc\\:description')?.textContent?.trim() || '';
  const publisher = opfDoc.querySelector('publisher, dc\\:publisher')?.textContent?.trim() || '';
  const language = opfDoc.querySelector('language, dc\\:language')?.textContent?.trim() || 'pt';
  const date = opfDoc.querySelector('date, dc\\:date')?.textContent?.trim() || '';
  const identifier = opfDoc.querySelector('identifier, dc\\:identifier')?.textContent?.trim() || '';

  // Manifest: mapeia ID para { href, mediaType, properties }
  const manifestItems = {};
  let coverHref = null;
  let ncxHref = null;
  let navHref = null;

  opfDoc.querySelectorAll('manifest > item').forEach(item => {
    const id = item.getAttribute('id') || '';
    const href = item.getAttribute('href') || '';
    const mediaType = item.getAttribute('media-type') || '';
    const properties = item.getAttribute('properties') || '';

    manifestItems[id] = { href, mediaType, properties };

    // Identificação de capa EPUB 3 (properties="cover-image")
    if (properties.includes('cover-image')) {
      coverHref = href;
    }

    // Identificação de Navigation Document EPUB 3 (properties="nav")
    if (properties.includes('nav') || mediaType === 'application/xhtml+xml' && id.toLowerCase().includes('toc')) {
      navHref = href;
    }

    // Identificação de NCX EPUB 2
    if (mediaType === 'application/x-dtbncx+xml' || id.toLowerCase() === 'ncx' || href.endsWith('.ncx')) {
      ncxHref = href;
    }
  });

  // Identificação de capa EPUB 2 via <meta name="cover" content="item_id"/>
  if (!coverHref) {
    const metaCover = opfDoc.querySelector('meta[name="cover"]');
    if (metaCover) {
      const coverId = metaCover.getAttribute('content');
      if (coverId && manifestItems[coverId]) {
        coverHref = manifestItems[coverId].href;
      }
    }
  }

  // Heurística de capa por ID ou Href no manifesto
  if (!coverHref) {
    for (const [id, item] of Object.entries(manifestItems)) {
      const lowerId = id.toLowerCase();
      const lowerHref = item.href.toLowerCase();
      if ((lowerId.includes('cover') || lowerHref.includes('cover')) && 
          (item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp)/i.test(item.href))) {
        coverHref = item.href;
        break;
      }
    }
  }

  // Extrai capa em Data URL se encontrada
  let coverDataUrl = null;
  if (coverHref) {
    const fullCoverPath = normalizePath(opfBaseDir, coverHref);
    const coverZipFile = zip.file(fullCoverPath) || zip.file(coverHref) || zip.file(decodeURIComponent(coverHref));
    if (coverZipFile) {
      try {
        const coverBlob = await coverZipFile.async('blob');
        coverDataUrl = await blobToDataUrl(coverBlob);
      } catch (err) {
        console.warn('Não foi possível carregar a capa do EPUB:', err);
      }
    }
  }

  // 3. Processar arquivos de texto na ordem do Spine
  const spineItemRefs = Array.from(opfDoc.querySelectorAll('spine > itemref'));
  const allWords = [];
  const rawParagraphs = [];
  const fileWordPositions = new Map(); // Caminho normalizado do arquivo -> { startIndex, endIndex, words }
  let currentWordOffset = 0;

  for (let idx = 0; idx < spineItemRefs.length; idx++) {
    const idref = spineItemRefs[idx].getAttribute('idref');
    const item = manifestItems[idref];
    if (!item) continue;

    const chapterPath = normalizePath(opfBaseDir, item.href);
    const chapterFile = zip.file(chapterPath) || zip.file(item.href) || zip.file(decodeURIComponent(item.href));
    if (!chapterFile) continue;

    const chapterHtml = await chapterFile.async('text');
    const chapterDoc = parser.parseFromString(chapterHtml, 'text/html');

    // Se ainda não achamos a capa, busca a primeira tag <img> do primeiro item do spine
    if (!coverDataUrl && idx === 0) {
      const firstImg = chapterDoc.querySelector('img, image');
      const imgSrc = firstImg?.getAttribute('src') || firstImg?.getAttribute('xlink:href');
      if (imgSrc) {
        const imgPath = normalizePath(getPathDir(chapterPath), imgSrc);
        const imgZip = zip.file(imgPath) || zip.file(imgSrc);
        if (imgZip) {
          try {
            const blob = await imgZip.async('blob');
            coverDataUrl = await blobToDataUrl(blob);
          } catch (e) {}
        }
      }
    }

    // Remove scripts e styles
    chapterDoc.querySelectorAll('script, style').forEach(el => el.remove());

    const titleNode = chapterDoc.querySelector('h1, h2, h3, title');
    const fallbackTitle = titleNode?.textContent?.trim() || `Seção ${idx + 1}`;

    const textContent = chapterDoc.body?.textContent || '';
    const cleanText = textContent.replace(/\s+/g, ' ').trim();

    const chapterWords = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
    const fileStartIndex = currentWordOffset;
    const fileEndIndex = currentWordOffset + chapterWords.length;

    fileWordPositions.set(chapterPath, {
      startIndex: fileStartIndex,
      endIndex: fileEndIndex,
      fallbackTitle,
      wordCount: chapterWords.length
    });
    // Também mapeia pelo href relativo
    fileWordPositions.set(item.href, {
      startIndex: fileStartIndex,
      endIndex: fileEndIndex,
      fallbackTitle,
      wordCount: chapterWords.length
    });

    if (chapterWords.length > 0) {
      allWords.push(...chapterWords);
      rawParagraphs.push(cleanText);
      currentWordOffset += chapterWords.length;
    }
  }

  // 4. Extrair o Índice Estruturado (TOC - Table of Contents)
  let structuredChapters = [];

  // Tentar 4.1: Extrair TOC do NCX (EPUB 2)
  if (ncxHref) {
    try {
      const fullNcxPath = normalizePath(opfBaseDir, ncxHref);
      const ncxFile = zip.file(fullNcxPath) || zip.file(ncxHref);
      if (ncxFile) {
        const ncxXml = await ncxFile.async('text');
        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
        const navPoints = Array.from(ncxDoc.querySelectorAll('navMap navPoint'));

        structuredChapters = navPoints.map((nav, idx) => {
          const navLabel = nav.querySelector('navLabel > text')?.textContent?.trim() || `Capítulo ${idx + 1}`;
          const contentSrc = nav.querySelector('content')?.getAttribute('src') || '';
          const cleanSrc = contentSrc.split('#')[0];
          const fullSrcPath = normalizePath(opfBaseDir, cleanSrc);

          const pos = fileWordPositions.get(fullSrcPath) || fileWordPositions.get(cleanSrc);
          return {
            id: `epub-toc-${idx + 1}`,
            title: navLabel.slice(0, 80),
            startIndex: pos ? pos.startIndex : 0,
            endIndex: pos ? pos.endIndex : allWords.length
          };
        }).filter(ch => ch.title && ch.startIndex !== undefined);
      }
    } catch (err) {
      console.warn('Erro ao processar toc.ncx:', err);
    }
  }

  // Tentar 4.2: Extrair TOC do Navigation Doc (EPUB 3) se NCX falhou ou não existe
  if (structuredChapters.length === 0 && navHref) {
    try {
      const fullNavPath = normalizePath(opfBaseDir, navHref);
      const navFile = zip.file(fullNavPath) || zip.file(navHref);
      if (navFile) {
        const navHtml = await navFile.async('text');
        const navDoc = parser.parseFromString(navHtml, 'text/html');
        const tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav#toc, nav');
        if (tocNav) {
          const links = Array.from(tocNav.querySelectorAll('a[href]'));
          structuredChapters = links.map((a, idx) => {
            const label = a.textContent?.trim() || `Capítulo ${idx + 1}`;
            const href = a.getAttribute('href') || '';
            const cleanHref = href.split('#')[0];
            const fullHrefPath = normalizePath(getPathDir(fullNavPath), cleanHref);

            const pos = fileWordPositions.get(fullHrefPath) || fileWordPositions.get(cleanHref);
            return {
              id: `epub-nav-${idx + 1}`,
              title: label.slice(0, 80),
              startIndex: pos ? pos.startIndex : 0,
              endIndex: pos ? pos.endIndex : allWords.length
            };
          }).filter(ch => ch.title);
        }
      }
    } catch (err) {
      console.warn('Erro ao processar navigation doc EPUB 3:', err);
    }
  }

  // 4.3 Fallback: Se não encontrou TOC estruturado, constrói a partir dos arquivos do Spine
  if (structuredChapters.length === 0) {
    let chIndex = 1;
    for (const [path, info] of fileWordPositions.entries()) {
      if (path.includes('/') && info.wordCount > 0) {
        structuredChapters.push({
          id: `epub-spine-${chIndex}`,
          title: info.fallbackTitle.slice(0, 80),
          startIndex: info.startIndex,
          endIndex: info.endIndex
        });
        chIndex++;
      }
    }
  }

  // Garante que os capítulos estejam em ordem crescente e sem buracos
  structuredChapters.sort((a, b) => a.startIndex - b.startIndex);
  
  // Remove capítulos duplicados no mesmo offset
  const uniqueChapters = [];
  const seenOffsets = new Set();
  for (const ch of structuredChapters) {
    if (!seenOffsets.has(ch.startIndex)) {
      seenOffsets.add(ch.startIndex);
      uniqueChapters.push(ch);
    }
  }

  // Ajusta os endIndices para cobrirem até o próximo capítulo
  for (let i = 0; i < uniqueChapters.length; i++) {
    if (i < uniqueChapters.length - 1) {
      uniqueChapters[i].endIndex = uniqueChapters[i + 1].startIndex;
    } else {
      uniqueChapters[i].endIndex = allWords.length;
    }
  }

  return {
    title,
    author,
    description,
    publisher,
    language,
    publishedDate: date,
    isbn: identifier,
    format: "EPUB",
    totalWords: allWords.length,
    words: allWords,
    rawText: rawParagraphs.join('\n\n'),
    coverDataUrl,
    chapters: uniqueChapters.length > 0 ? uniqueChapters : [{
      id: "epub-ch-1",
      title: "Início",
      startIndex: 0,
      endIndex: allWords.length
    }]
  };
}

/**
 * Utilitários internos de manipulação de caminhos em ZIP
 */
function normalizePath(baseDir, relativePath) {
  if (!relativePath) return '';
  if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
  const parts = (baseDir + relativePath).split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function getPathDir(filePath) {
  if (!filePath || !filePath.includes('/')) return '';
  return filePath.substring(0, filePath.lastIndexOf('/') + 1);
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
