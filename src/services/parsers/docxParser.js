import JSZip from 'jszip';

/**
 * Parser avançado para documentos Word (.docx) usando JSZip e DOMParser nativo.
 * Extrai capas de thumbnail/mídia, metadados de core.xml e índice baseado em cabeçalhos e estilos.
 */
export async function parseDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Arquivo DOCX inválido: word/document.xml não encontrado.');
  }

  const xmlContent = await documentXmlFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

  // 1. Extração de Capa / Thumbnail do DOCX
  let coverDataUrl = null;
  const thumbFile = zip.file('docProps/thumbnail.jpeg') || zip.file('docProps/thumbnail.png') || zip.file('docProps/thumbnail.wmf');
  if (thumbFile) {
    try {
      const thumbBlob = await thumbFile.async('blob');
      coverDataUrl = await blobToDataUrl(thumbBlob);
    } catch (e) {
      console.warn('Não foi possível ler thumbnail do DOCX:', e);
    }
  }

  // Se não achou thumbnail, tenta primeira imagem embutida de word/media/
  if (!coverDataUrl) {
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('word/media/image1.') || f.startsWith('word/media/image.'));
    if (mediaFiles.length > 0) {
      try {
        const mediaFile = zip.file(mediaFiles[0]);
        if (mediaFile) {
          const mediaBlob = await mediaFile.async('blob');
          coverDataUrl = await blobToDataUrl(mediaBlob);
        }
      } catch (e) {}
    }
  }

  // 2. Busca parágrafos <w:p>
  const paragraphs = xmlDoc.getElementsByTagName('w:p');
  const extractedParagraphs = [];
  const chapters = [];
  const words = [];
  let wordOffset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textNodes = p.getElementsByTagName('w:t');
    let pText = '';

    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent || '';
    }

    const trimmed = pText.trim();
    if (!trimmed) continue;

    extractedParagraphs.push(trimmed);
    const pWords = trimmed.split(/\s+/).filter(Boolean);

    // Detecção robusta de títulos, cabeçalhos e capítulos
    const pStyle = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') || '';
    const outlineLvl = p.getElementsByTagName('w:outlineLvl')[0]?.getAttribute('w:val');
    
    const isHeadingStyle = /heading|t[íi]tulo|header|subheading/i.test(pStyle);
    const isOutline = outlineLvl !== undefined && Number(outlineLvl) <= 2;
    const isChapterText = trimmed.length < 90 && (
      /^cap[íi]tulo\s+[0-9ivxlcdm]+/i.test(trimmed) ||
      /^parte\s+[0-9ivxlcdm]+/i.test(trimmed) ||
      /^[0-9]+(\.[0-9]+)*\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/i.test(trimmed) ||
      /^(sum[áa]rio|índice|introdução|prefácio|conclusão)/i.test(trimmed)
    );

    const isHeading = isHeadingStyle || isOutline || isChapterText;

    if (isHeading || chapters.length === 0) {
      chapters.push({
        id: `docx-ch-${chapters.length + 1}`,
        title: trimmed.slice(0, 70),
        startIndex: wordOffset,
        endIndex: wordOffset + pWords.length
      });
    } else if (chapters.length > 0) {
      chapters[chapters.length - 1].endIndex = wordOffset + pWords.length;
    }

    words.push(...pWords);
    wordOffset += pWords.length;
  }

  // 3. Extrair metadados de docProps/core.xml
  let title = file.name.replace(/\.[^/.]+$/, "");
  let author = "Autor Desconhecido";
  let description = "";
  let publisher = "";
  let publishedDate = "";

  try {
    const coreXmlFile = zip.file('docProps/core.xml');
    if (coreXmlFile) {
      const coreXml = await coreXmlFile.async('text');
      const coreDoc = parser.parseFromString(coreXml, 'application/xml');
      
      const titleElem = coreDoc.querySelector('title, dc\\:title');
      const creatorElem = coreDoc.querySelector('creator, dc\\:creator');
      const descElem = coreDoc.querySelector('description, dc\\:description, subject, dc\\:subject');
      const pubElem = coreDoc.querySelector('publisher, dc\\:publisher');
      const dateElem = coreDoc.querySelector('created, dcterms\\:created, modified, dcterms\\:modified');

      if (titleElem && titleElem.textContent?.trim()) title = titleElem.textContent.trim();
      if (creatorElem && creatorElem.textContent?.trim()) author = creatorElem.textContent.trim();
      if (descElem && descElem.textContent?.trim()) description = descElem.textContent.trim();
      if (pubElem && pubElem.textContent?.trim()) publisher = pubElem.textContent.trim();
      if (dateElem && dateElem.textContent?.trim()) publishedDate = dateElem.textContent.trim();
    }
  } catch (e) {
    console.warn('Erro ao ler metadados core.xml:', e);
  }

  return {
    title,
    author,
    description,
    publisher,
    publishedDate,
    format: "DOCX",
    totalWords: words.length,
    words,
    rawText: extractedParagraphs.join('\n\n'),
    coverDataUrl,
    chapters: chapters.length > 0 ? chapters : [{
      id: "docx-ch-1",
      title: "Documento Principal",
      startIndex: 0,
      endIndex: words.length
    }]
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
