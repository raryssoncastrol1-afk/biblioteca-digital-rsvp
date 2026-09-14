/**
 * Extrai capítulos a partir da página de SUMÁRIO/ÍNDICE do livro.
 * Cada linha tem o padrão: "TÍTULO ....... 13" (título + pontilhado + página impressa).
 * Converte o número da página IMPRESSA para o índice da página FÍSICA e então
 * para o offset de palavras — assim o salto leva ao texto certo.
 *
 * Módulo puro (sem dependências) para poder ser testado isoladamente.
 */

export function extractChaptersFromSummary(rawParagraphs, pageWordOffsets, numPages) {
  const entries = [];

  // Localiza a página que contém o sumário
  // Critério: tem "SUMÁRIO" ou "ÍNDICE" E também "CAPÍTULO" (lista de capítulos),
  // ou "APRESENTAÇÃO"/"PREFÁCIO". Evita "ÍNDICE REMISSIVO"/"ÍNDICE DE ASSUNTOS"
  // (finais do livro, sem CAPÍTULO).
  let summaryPageIdx = -1;
  for (let i = 0; i < rawParagraphs.length; i++) {
    const text = (rawParagraphs[i] || '').toUpperCase();
    const hasSummaryWord = text.includes('SUMÁRIO') || text.includes('ÍNDICE');
    const hasChapter = /CAP[ÍI]TULO/.test(text);
    const hasFrontMatter = /APRESENTAÇÃO|PREF[ÁA]CIO/.test(text);
    if (hasSummaryWord && (hasChapter || hasFrontMatter)) {
      summaryPageIdx = i;
      break;
    }
  }
  if (summaryPageIdx === -1) return [];

  const summaryLines = (rawParagraphs[summaryPageIdx] || '').split('\n');

  // Se o texto veio "achatado" (uma linha gigante, sem quebras), tenta reconstruir as linhas
  // a partir do padrão: algo com pontilhado e número (ex.: "APRESENTAÇÃO ... 7  CAPÍTULO 1 ...").
  const rawSummary = rawParagraphs[summaryPageIdx] || '';
  if (summaryLines.length === 1 && /\u2026+|\.{4,}/.test(rawSummary)) {
    // Divide em entradas: cada "TÍTULO ... <num>" vira uma linha
    const rebuilt = rawSummary.match(/(?:[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^.\u2026]{2,}?|CAP[ÍI]TULO\s+\d+)[.\u2026]+\s*\d{1,4}/g);
    if (rebuilt && rebuilt.length >= 3) {
      summaryLines.length = 0;
      summaryLines.push(...rebuilt);
    }
  }

  // Determina a página física correspondente a cada número IMPRESSO:
  // converge iterativamente a série de números impressos das páginas de sumário.
  const numberingByPhysical = new Map(); // físico -> impresso
  // Olha também páginas vizinhas ao sumário (2 antes, 4 depois são suficientes)
  const scanStart = Math.max(0, summaryPageIdx - 2);
  const scanEnd = Math.min(rawParagraphs.length, summaryPageIdx + 6);
  for (let p = scanStart; p < scanEnd; p++) {
    const text = (rawParagraphs[p] || '').trim();
    if (!text) continue;
    // Último número isolado no final da página costuma ser o número impresso
    const nums = text.match(/\b\d{1,4}\b/g);
    if (!nums || nums.length === 0) continue;
    const lastNum = Number(nums[nums.length - 1]);
    if (lastNum > 0 && lastNum < 1500 && !numberingByPhysical.has(p)) {
      numberingByPhysical.set(p, lastNum);
    }
  }

  // Monta um array ordenado (físico -> impresso) e infere a série
  const pairs = [...numberingByPhysical.entries()].sort((a, b) => a[0] - b[0]);
  let counterOffset = 0;
  if (pairs.length > 1) {
    // Se há mais de um par, a diferença entre impressos e físicos revela o offset
    // (página física - página impressa = offset constante na região do sumário).
    // Em PDFs de livro, a capa e as páginas frontais não são numeradas; o corpo
    // normaliza para física == impressa. Se a moda das diferenças for negativa
    // (numeração defasada nas vizinhas do sumário), usamos offset 0 (física == impressa).
    const diffs = [];
    for (let i = 1; i < pairs.length; i++) {
      diffs.push(pairs[i][0] - pairs[i][1]);
    }
    // Moda
    const counts = new Map();
    diffs.forEach(d => counts.set(d, (counts.get(d) || 0) + 1));
    let bestDiff = 0, bestCount = 0;
    for (const [d, c] of counts) {
      if (c > bestCount) { bestCount = c; bestDiff = d; }
    }
    // Se a moda for negativa, é porque as páginas vizinhas ao sumário têm numeração
    // impressa defasada (capa/frontais não numeradas). O corpo do livro normaliza
    // para física == impressa a partir da primeira página numerada — usamos offset 0.
    counterOffset = bestDiff < 0 ? 0 : bestDiff;
  } else if (pairs.length === 1) {
    // Sem referência cruzada, assume que a primeira página física é "1"
    counterOffset = pairs[0][0] - pairs[0][1];
  }

  /** Converte página impressa → índice da página física (0-based, -1 se fora do range) */
  function printedToPhysical(printed) {
    const phys = printed + counterOffset; // 1-based física
    const idx = phys - 1;                  // 0-based índice
    return idx >= 0 && idx < numPages ? idx : -1;
  }

  let pendingChapterLabel = ''; // rótulo "CAPÍTULO N" da linha anterior (sem pontilhado)
  let pendingContinuation = ''; // título quebrado na linha anterior (sem número de página)

  // Processa as linhas do sumário
  for (let li = 0; li < summaryLines.length; li++) {
    const rawLine = summaryLines[li];
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // Linha do tipo "CAPÍTULO 1" (sem pontilhado) define o rótulo para a próxima entrada
    const labelMatch = line.match(/^CAP[ÍI]TULO\s+([0-9IVXLCDM]+)\s*$/i);
    if (labelMatch) {
      pendingChapterLabel = line.trim();
      continue;
    }

    // Tenta casar como entrada de sumário (com pontilhado, ou sem pontilhado se houver rótulo pendente)
    const pageMatch = line.match(
      pendingChapterLabel
        ? /(?:\u2026+|\.{3,})?\s*(\d{1,4})\s*$/
        : /(?:\u2026+|\.{3,})\s*(\d{1,4})\s*$/
    );

    // Se NÃO casou com número no final, pode ser a continuação de um título quebrado
    // (ex.: "EVIDÊNCIAS INDIRETAS DA ESCRITURA SOBRE A DIVINDADE DO")
    if (!pageMatch) {
      const letters = line.match(/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g);
      const isHeader = /^(SUM[ÁA]RIO|ÍNDICE)\s*$/i.test(line);
      const endsWithNumber = /\d{1,4}\s*$/.test(line);
      if (!isHeader && !endsWithNumber && letters && letters.length >= 4 && line.length < 90) {
        pendingContinuation = line;
      }
      continue;
    }

    const printedPage = Number(pageMatch[1]);
    if (printedPage === 0 || printedPage > 1500) continue;

    // Remove o número do final e limpa pontilhados/dots do título
    let title = line.slice(0, pageMatch.index).replace(/[.\u2026]+/g, ' ').trim();
    if (!title) continue;
    // Ignora linhas que não parecem título (muito curtas, só "CAPÍTULO", ou cabeçalhos repetidos)
    if (title.length < 3 || /^(SUM[ÁA]RIO|ÍNDICE)$/i.test(title) || /^CAP[ÍI]TULO\s*$/.test(title)) continue;
    // Ignora se o texto antes do pontilhado não contém ao menos uma letra (título real)
    if (!/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/i.test(title)) continue;

    // Se há uma continuação pendente de um título quebrado, junta (ex.: "...DIVINDADE DO" + "REDENTOR 221")
    if (pendingContinuation) {
      title = `${pendingContinuation} ${title}`;
      pendingContinuation = '';
    }

    // Se há um rótulo "CAPÍTULO N" pendente, o título contínua: junta (ex.: "CAPÍTULO 7 - EVIDÊNCIAS INDIRETAS...")
    if (pendingChapterLabel && !/^CAP[ÍI]TULO\s+[0-9IVXLCDM]+/i.test(title)) {
      title = `${pendingChapterLabel} - ${title}`;
    }
    pendingChapterLabel = '';

    const physicalPage = printedToPhysical(printedPage);
    if (physicalPage === -1) continue;

    const startIndex = pageWordOffsets[physicalPage] ?? null;
    if (startIndex === null) continue;

    entries.push({
      title: title.slice(0, 80),
      page: printedPage,
      startIndex
    });
  }

  // Remove duplicados (mesma página) mantendo o primeiro
  const unique = [];
  const seen = new Set();
  entries.forEach(e => {
    if (!seen.has(e.startIndex)) {
      seen.add(e.startIndex);
      unique.push(e);
    }
  });
  unique.sort((a, b) => a.startIndex - b.startIndex);

  // Limpeza final dos títulos: remove prefixos espúrios que o parser de texto achatado
  // pode ter colado (ex.: "POR QUE UMA SÉRIE DE LIVROS SOBRE JESUS CRISTO? 5 SUMÁRIO APRESENTAÇÃO").
  // NÃO remove títulos legítimos que começam com "CAPÍTULO N" / "PARTE N".
  for (const ch of unique) {
    let t = ch.title;
    if (!/^CAP[ÍI]TULO\s+[0-9IVXLCDM]+\b/i.test(t)) {
      // Remove padrão "TEXTO número" repetido no início (cabeçalho/rodapé colado)
      t = t.replace(/^(?:[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^.\u2026]*?\d{1,4}\s*)+/i, '');
      // Se sobrou "SUMÁRIO" / "ÍNDICE" no início, remove
      t = t.replace(/^\s*(?:SUM[ÁA]RIO|ÍNDICE)\s*[-–—]?\s*/i, '');
    }
    t = t.trim();
    if (t.length >= 2) ch.title = t;
  }

  // Se houver pelo menos 3 entradas confiáveis, usa o sumário
  return unique.length >= 3 ? unique : [];
}