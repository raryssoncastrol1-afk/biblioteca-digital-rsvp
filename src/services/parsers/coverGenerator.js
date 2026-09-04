/**
 * Gerador de Capas Artísticas Dinâmicas para Documentos sem Capa
 * Renderiza em Canvas no navegador e exporta como Data URL
 */

const PALETTES = [
  ['#1e1b4b', '#312e81', '#4338ca'], // Indigo profundo
  ['#0f172a', '#1e293b', '#334155'], // Slate moderno
  ['#064e3b', '#065f46', '#047857'], // Esmeralda nobre
  ['#450a0a', '#7f1d1d', '#991b1b'], // Carmesim
  ['#3b0764', '#581c87', '#6b21a8'], // Púrpura real
  ['#172554', '#1e3a8a', '#1d4ed8'], // Azul oceano
  ['#292524', '#44403c', '#57534e']  // Titânio
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Gera uma capa estilizada usando Canvas em alta resolução
 * 
 * @param {string} title 
 * @param {string} author 
 * @param {string} format 
 * @returns {string} Data URL da imagem JPEG gerada
 */
export function generateDynamicCover(title = 'Livro Sem Título', author = 'Autor Desconhecido', format = 'LIVRO') {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 900;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const hash = hashString(title + author);
    const palette = PALETTES[hash % PALETTES.length];

    // Fundo em Gradiente Linear suave
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.5, palette[1]);
    gradient.addColorStop(1, palette[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Efeito de textura e sombras na lombada (esquerda)
    const spineGradient = ctx.createLinearGradient(0, 0, 45, 0);
    spineGradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    spineGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
    spineGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = spineGradient;
    ctx.fillRect(0, 0, 45, height);

    // Moldura elegante interna
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.strokeRect(35, 35, width - 70, height - 70);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, width - 90, height - 90);

    // Badge de Formato
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    const badgeW = 100;
    const badgeH = 28;
    const badgeX = (width - badgeW) / 2;
    const badgeY = 90;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((format || 'LIVRO').toUpperCase(), width / 2, badgeY + badgeH / 2);

    // Ícone decorativo central geométrico
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, 230, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Símbolo de livro estilizado no centro
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 20, 235);
    ctx.quadraticCurveTo(width / 2, 225, width / 2, 240);
    ctx.lineTo(width / 2, 220);
    ctx.quadraticCurveTo(width / 2, 210, width / 2 - 20, 220);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width / 2 + 20, 235);
    ctx.quadraticCurveTo(width / 2, 225, width / 2, 240);
    ctx.lineTo(width / 2, 220);
    ctx.quadraticCurveTo(width / 2, 210, width / 2 + 20, 220);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Título do Livro (com quebra de linha inteligente)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxTitleWidth = width - 130;
    const words = title.split(' ');
    let lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTitleWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Limita a 4 linhas no máximo
    if (lines.length > 4) {
      lines = lines.slice(0, 3);
      lines[2] += '...';
    }

    const titleStartY = 420 - (lines.length * 24);
    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, titleStartY + (idx * 50));
    });

    // Linha divisória de destaque
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 50, 600);
    ctx.lineTo(width / 2 + 50, 600);
    ctx.stroke();

    // Nome do Autor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 22px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(author || 'Autor Desconhecido', width / 2, 650);

    // Rodapé sutil da Biblioteca RSVP
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('RSVP FOCUS • BIBLIOTECA DIGITAL', width / 2, height - 70);

    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (err) {
    console.warn('Erro ao gerar capa dinâmica em canvas:', err);
    return null;
  }
}
