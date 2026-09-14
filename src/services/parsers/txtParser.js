/**
 * Parser para arquivos de texto simples (.txt, .md)
 * Suporta metadados via frontmatter YAML e detecção semântica de capítulos e seções.
 */

export async function parseTxtFile(file) {
  const text = await file.text();
  
  // Normaliza quebras de linha
  let normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  let title = file.name.replace(/\.[^/.]+$/, "");
  let author = "Autor Desconhecido";
  let description = "";

  // 1. Extração de Frontmatter YAML (comum em arquivos Markdown / Obsidian)
  const frontmatterMatch = normalizedText.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const yamlBlock = frontmatterMatch[1];
    normalizedText = normalizedText.replace(frontmatterMatch[0], ''); // remove frontmatter do texto

    const titleMatch = yamlBlock.match(/title:\s*["']?([^\n"']+)["']?/i);
    const authorMatch = yamlBlock.match(/author:\s*["']?([^\n"']+)["']?/i);
    const descMatch = yamlBlock.match(/(?:description|summary):\s*["']?([^\n"']+)["']?/i);

    if (titleMatch) title = titleMatch[1].trim();
    if (authorMatch) author = authorMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
  }

  // 2. Extrai linhas para detecção precisa de títulos e parágrafos
  const lines = normalizedText.split('\n');
  const chapters = [];
  const allWords = [];
  let currentWordOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lineWords = line.split(/\s+/).filter(Boolean);
    const isMdHeading = /^#+\s+/.test(line);
    // Título vira capítulo quando: é marcação Markdown, ou é uma linha curta
    // (menos de ~80 chars) que começa com marcador estrutural —
    // "Capítulo N" (com . : — - _ ou nada), "Parte N", "Seção N", "1.", "1.1.",
    // ou palavras-chave (Sumário, Introdução, Prefácio, Conclusão, etc.).
    const isChapterHeading = line.length < 80 && (
      /^cap[íi]tulo\b/i.test(line) ||                       // Capítulo / Capítulo 1 / Capítulo I
      /^parte\b/i.test(line) ||                             // Parte 1 / Parte I
      /^se[çc][ãa]o\b/i.test(line) ||                       // Seção 1
      /^anexo\b/i.test(line) ||                             // Anexo A / Anexo 1
      /^\d+(\.\d+)*\.?\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]/.test(line) || // "1. Introdução", "1.1. Título", "2.1.1 Exemplo"
      /^(sum[áa]rio|índice|introdu[çc][ãa]o|pref[áa]cio|conclus[ãa]o|ep[íi]logo|pr[óo]logo|agradecimentos|refer[êe]ncias|bibliografia|ap[êe]ndice)/i.test(line)
    );

    const cleanTitle = line.replace(/^#+\s*/, '').trim();

    if (isMdHeading || isChapterHeading || chapters.length === 0) {
      chapters.push({
        id: `txt-ch-${chapters.length + 1}`,
        title: cleanTitle.slice(0, 60),
        startIndex: currentWordOffset,
        endIndex: currentWordOffset + lineWords.length
      });
    } else if (chapters.length > 0) {
      chapters[chapters.length - 1].endIndex = currentWordOffset + lineWords.length;
    }

    allWords.push(...lineWords);
    currentWordOffset += lineWords.length;
  }

  // Se não achou título no frontmatter, usa o título do primeiro capítulo se for razoável
  if (title === file.name.replace(/\.[^/.]+$/, "") && chapters.length > 0) {
    if (chapters[0].title.length > 2 && chapters[0].title.length < 60) {
      title = chapters[0].title;
    }
  }

  // Ajusta os endIndices para cobrirem até o próximo capítulo
  for (let i = 0; i < chapters.length; i++) {
    if (i < chapters.length - 1) {
      chapters[i].endIndex = chapters[i + 1].startIndex;
    } else {
      chapters[i].endIndex = allWords.length;
    }
  }

  return {
    title,
    author,
    description,
    format: file.name.endsWith('.md') ? "MD" : "TXT",
    totalWords: allWords.length,
    words: allWords,
    rawText: normalizedText,
    chapters: chapters.length > 0 ? chapters : [{
      id: "ch-1",
      title: "Início",
      startIndex: 0,
      endIndex: allWords.length
    }]
  };
}
