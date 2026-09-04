/**
 * Motor de Cálculo ORP (Optimal Recognition Point) e Dwell-Time Cognitivo
 * Biblioteca Digital & Leitor RSVP Focus
 */

/**
 * Calcula o ponto de reconhecimento ideal (ORP) e o multiplicador de pausa cognitiva
 * 
 * @param {string} word - Palavra atual a ser renderizada
 * @param {string} [prevWord=''] - Palavra anterior (para análise contextual se necessário)
 * @param {boolean} [adaptive=true] - Habilitar dwell-time adaptativo baseado na complexidade
 * @param {boolean} [punct=true] - Habilitar pausas reflexivas de wrap-up sintático
 * @returns {{ focalIndex: number, pauseMultiplier: number, prefix: string, focalChar: string, suffix: string }}
 */
export function calculateORP(word, prevWord = '', adaptive = true, punct = true) {
  if (!word || word.length === 0) {
    return {
      focalIndex: 0,
      pauseMultiplier: 1.0,
      prefix: '',
      focalChar: '',
      suffix: ''
    };
  }

  const cleanWord = word.trim();
  const len = cleanWord.length;

  // Índice focal foveal ótimo (posição ~33% da palavra)
  const focalIndex = len <= 1 ? 0 : Math.floor((len - 1) / 3);

  let pauseMult = 1.0;

  if (adaptive) {
    // 1. Nomes próprios e siglas em maiúsculas (+38%)
    if (/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(cleanWord)) {
      pauseMult *= 1.38;
    }
    // 2. Termos longos e complexos (+45%)
    if (len > 10) {
      pauseMult *= 1.45;
    }
    // 3. Palavras curtas funcionais (artigos, preposições) para fluência rápida (-12%)
    if (len <= 3) {
      pauseMult *= 0.88;
    }
    // 4. Estrangeirismos e caracteres especiais/numéricos (+40%)
    if (/[0-9$€¥%@#_]/.test(cleanWord) || /^[A-Z]{2,}$/.test(cleanWord)) {
      pauseMult *= 1.40;
    }
  }

  // Wrap-up sintático: Pausas reflexivas em pontuações
  if (punct && /[.,:;!?—\-]/.test(cleanWord)) {
    if (/[.!?]/.test(cleanWord)) {
      pauseMult *= 1.85; // Final de período
    } else if (/[,:;—\-]/.test(cleanWord)) {
      pauseMult *= 1.35; // Vírgulas, dois pontos, ponto e vírgula
    }
  }

  const prefix = cleanWord.slice(0, focalIndex);
  const focalChar = cleanWord.charAt(focalIndex);
  const suffix = cleanWord.slice(focalIndex + 1);

  return {
    focalIndex,
    pauseMultiplier: pauseMult,
    prefix,
    focalChar,
    suffix
  };
}

/**
 * Calcula a duração de exibição em milissegundos para uma palavra baseada no WPM
 * 
 * @param {number} wpm - Palavras por minuto desejadas (ex: 300, 500, 800)
 * @param {number} pauseMultiplier - Multiplicador retornado por calculateORP
 * @returns {number} Duração em ms
 */
export function calculateDwellTime(wpm, pauseMultiplier = 1.0) {
  const safeWpm = Math.max(50, Math.min(2500, wpm));
  const baseMs = (60 / safeWpm) * 1000;
  return Math.round(baseMs * pauseMultiplier);
}
