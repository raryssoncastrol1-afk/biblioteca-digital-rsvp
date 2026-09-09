# Relatório de Análise UX — Biblioteca Digital
## Foco: Experiência Mobile em Telas 20:9 (360×800 CSS px)

**Data:** Setembro 2026
**Plataforma-alvo:** Smartphones modernos com proporção 20:9, viewport de 360×800 px CSS
**Lei de Pareto aplicada:** 80% da fricção mobile vem de ~20% das decisões de layout — este relatório prioriza esses 20%.

---

## Índice

1. [Visão Geral dos Problemas Identificados](#1-visão-geral)
2. [TOP 8 Problemas de Maior Impacto (Classificados por Prioridade)](#2-top-8-problemas)
3. [O Que Já Funciona Bem no Mobile](#3-o-que-ja-funciona-bem)
4. [Plano de Ação Priorizado](#4-plano-de-ação)

---

## 1. Visão Geral dos Problemas Identificados

Após análise do codebase, foram identificados **13 problemas relevantes** para mobile 20:9. Este relatório seleciona os **8 de maior impacto** usando o Princípio de Pareto: resolver esses 8 elimina a maioria da fricção experimentada em telas de 360px.

| # | Problema | Prioridade | Lei UX Aplicável | Esforço |
|---|----------|------------|-------------------|---------|
| 1 | RSVP: fonte fixa sem adaptação à viewport | **Crítico** | Cognitive Load + Miller's Law | Baixo |
| 2 | RSVP: controles footer excedem 360px | **Crítico** | Fitts's Law + Hicks's Law | Médio |
| 3 | RSVP: sem gestos touch (swipe) | **Alto** | Fitts's Law + Postel's Law | Alto |
| 4 | Modais centralizados sem bottom-sheet | **Alto** | Fitts's Law + Jakob's Law | Médio |
| 5 | Toast na borda inferior-direita off-screen | **Alto** | Selective Attention + Doherty Threshold | Baixo |
| 6 | Sem scroll-lock no body ao abrir modal | **Alto** | Cognitive Load + Postel's Law | Baixo |
| 7 | Input busca com min-width 240px | **Médio** | Fitts's Law + Miller's Law | Baixo |
| 8 | Sem viewport-fit=cover nem safe areas | **Médio** | Cognitive Load + Jakob's Law | Baixo |

---

## 2. TOP 8 Problemas de Maior Impacto

---

### PROBLEMA 1 (CRÍTICO): RSVP com Fonte Fixa — Truncamento Agressivo em 360px

**Onde no código:** Tamanho de fonte definido como valor fixo em px (faixa de 28–76px), sem adaptação responsiva.

**Lei UX: Cognitive Load + Miller's Law**

A **Lei de Miller** (skill: `millers-law`) afirma que a memória de trabalho humana processa ~7±2 unidades de informação simultaneamente. Quando uma palavra RSVP é truncada — mostrando apenas ~3 caracteres em cada lado do caractere focal — o cérebro perde o contexto necessário para reconstruir a palavra, **forçando carga cognitiva extrínseca desnecessária** (skill: `cognitive-load`). O usuário passa a adivinhar palavras em vez de ler.

Em uma tela de 360px com fonte de 48px, cada caractere ocupa ~28-30px. Com padding e margem, restam apenas ~5-6 caracteres visíveis. Palavras como "biblioteconomia" ou "desenvolvimento" viram "bib…ia" ou "des…to".

**Recomendação concreta:**

```tsx
// Antes (estimado):
const fontSize = config.fontSize || 48; // px fixo

// Depois:
function getRSVPFontSize(viewportWidth: number, baseFontSize: number): number {
  const maxCharsVisible = Math.floor((viewportWidth * 0.55) / (baseFontSize * 0.6));
  // Se a palavra cabe inteira, não reduza
  const clamped = Math.min(baseFontSize, viewportWidth * 0.12);
  return Math.max(clamped, 24); // mínimo legível
}

// Alternativa mais simples: usar clamp()
// fontSize: clamp(24px, 8vw, 76px)
```

No componente RSVP Reader, aplicar:
```tsx
style={{
  fontSize: `clamp(24px, ${fontSize * (360 / 1200) * 100 / 360}vw, ${fontSize}px)`
}}
// Ou diretamente:
style={{ fontSize: `clamp(24px, 8vw, ${fontSize}px)` }}
```

**Também melhoraria Desktop?** Não diretamente — desktop tem viewport larga o suficiente. Mas unifica a lógica.

**Skill a consultar:** `cognitive-load`, `millers-law`

---

### PROBLEMA 2 (CRÍTICO): Controles do Footer RSVP Excedem 360px

**Onde no código:** Três grupos de controles no footer do RSVP reader com largura combinada de ~712px. Usa `flex-wrap` mas sem adaptação interna dos grupos. O grupo WPM sozinho tem ~384px.

**Lei UX: Fitts's Law + Hicks's Law**

**Fitts's Law** (skill: `fittss-law`) diz que tempo de aquisição de alvo depende da distância e tamanho. Em 360px, o overflow força scroll horizontal invisível ou esconde controles — o usuário nem sabe que existem. **Hicks's Law** (skill: `hicks-law`) complementa: quando múltiplos controles estão empilhados horizontalmente fora da tela, o tempo de decisão explode porque o usuário não pode ver todas as opções simultaneamente.

**Recomendação concreta:**

```tsx
// Estratégia: layout em grid vertical no mobile, horizontal no desktop
<div className="
  flex flex-col gap-3
  sm:flex-row sm:items-center sm:justify-between
  w-full
">
  {/* Grupo WPM */}
  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
    <Button onClick={decreaseWPM}>−</Button>
    <span className="text-sm font-mono tabular-nums min-w-[4ch] text-center">{wpm} WPM</span>
    <Button onClick={increaseWPM}>+</Button>
  </div>

  {/* Grupo Fonte */}
  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
    <Button onClick={decreaseFont}>A−</Button>
    <span className="text-sm min-w-[3ch] text-center">{Math.round(currentFont)}px</span>
    <Button onClick={increaseFont}>A+</Button>
  </div>

  {/* Grupo Controle */}
  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
    <Button onClick={toggleProgress}><BarChart /></Button>
    <Button onClick={toggleSettings}><Settings /></Button>
  </div>
</div>
```

Resultado: no mobile, os 3 grupos empilham verticalmente, cada um centralizado, sem overflow.

**Também melhoraria Desktop?** Sim — flex-wrap com justify centralizado melhora a organização em qualquer tela.

**Skill a consultar:** `fittss-law`, `hicks-law`

---

### PROBLEMA 3 (ALTO): Ausência de Gestos Touch no RSVP Reader

**Onde no código:** Toda interação é via teclado (Space, setas, C, S, F, R, H). Mobile tem apenas botões on-screen. Sem swipe para avançar/voltar, sem swipe para buscar posição.

**Lei UX: Fitts's Law + Postel's Law**

**Fitts's Law** (skill: `fittss-law`): botões on-screen pequenos em um reader de leitura rápida (RSVP) forçam o olho a sair da posição focal para encontrar o botão, depois voltar. Cada ciclo é ~200-400ms de perda. **Postel's Law** (skill: `postels-law`) exige que sejamos tolerantes com os inputs — em mobile, swipe é o input natural; aceitar apenas touch em botões é ser rígido demais.

**Recomendação concreta:**

```tsx
import { useSwipeable } from 'react-swipeable';
// Ou implementação vanilla com touch events

const handlers = useSwipeable({
  onSwipedLeft: () => nextWord(),    // Avançar palavra
  onSwipedRight: () => prevWord(),   // Voltar palavra
  onSwipedUp: () => increaseWPM(),   // Aumentar velocidade
  onSwipedDown: () => decreaseWPM(), // Diminuir velocidade
  onTouchEnd: (e) => {
    // Tap duplo = pausar/play (toggle)
  },
  trackMouse: false,
});

return (
  <div {...handlers} className="select-none touch-pan-y">
    <div className="rsvp-word">{currentWord}</div>
  </div>
);
```

Consideração adicional: adicionar um **tutorial de gestos** na primeira vez que o usuário abre o RSVP no mobile — overlay leve mostrando os gestos disponíveis.

**Também melhoraria Desktop?** Não — desktop não tem touch. Mas `trackMouse: true` pode ser útil para testes em desktop com trackpad.

**Skill a consultar:** `fittss-law`, `postels-law`

---

### PROBLEMA 4 (ALTO): Modais Centralizados em Telas Altas 20:9

**Onde no código:** Modais usam `fixed inset-0 flex items-center justify-center` (centralização clássica).

**Lei UX: Fitts's Law + Jakob's Law**

**Fitts's Law** (skill: `fittss-law`): em uma tela de 800px de altura, o centro está a ~400px do topo. Com a barra de endereço do browser (~60px) e a barra de ferramentas, o centro visual real fica em ~340-370px — fora da zona de conforto do polegar em uso com uma mão. **Jakob's Law** (skill: `jakobs-law`): usuários mobile esperam modais em bottom-sheet (Google, iOS, Android Material Design) — modal centralizado quebra a convenção estabelecida.

**Recomendação concreta:**

```tsx
// Usar transição responsiva: bottom-sheet no mobile, center no desktop

<div className="fixed inset-0 z-50">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/60" onClick={onClose} />

  {/* Modal */}
  <div className={`
    absolute
    bottom-0 left-0 right-0          /* Mobile: bottom-sheet */
    sm:bottom-auto sm:left-1/2       /* Desktop: centralizado */
    sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
    sm:max-w-lg sm:w-full
    max-h-[85vh]                     /* Limitar altura no mobile */
    overflow-y-auto
    overscroll-behavior: contain     /* Ver Problema 6 */
    bg-white rounded-t-2xl           /* Mobile: cantos arredondados em cima */
    sm:rounded-2xl                   /* Desktop: cantos arredondados em todos */
  ">
    {/* Handle visual para bottom-sheet */}
    <div className="sm:hidden flex justify-center pt-3 pb-1">
      <div className="w-10 h-1 rounded-full bg-gray-300" />
    </div>
    {children}
  </div>
</div>
```

**Também melhoraria Desktop?** Sim — o componente unificado funciona em ambas as plataformas. No desktop, a lógica `sm:` mantém o centro clássico.

**Skill a consultar:** `fittss-law`, `jakobs-law`

---

### PROBLEMA 5 (ALTO): Toast na Borda Inferior-Direita Atinge Fora da Tela

**Onde no código:** Toast posicionado em `bottom-4 right-4` (ou equivalente).

**Lei UX: Selective Attention + Doherty Threshold**

**Selective Attention** (skill: `selective-attention`): se o toast está parcialmente off-screen, o usuário pode nem percebê-lo — o cérebro filtra estímulos periféricos. **Doherty Threshold** (skill: `doherty-threshold`): feedback deve ser percebido em <400ms. Se o toast aparece mas não é visto porque está fora do campo de atenção, o feedback falha completamente.

**Recomendação concreta:**

```tsx
// ToastContainer - adaptar posição por viewport

<div className="
  fixed bottom-4 left-4 right-4    /* Mobile: bottom-4 left-4 right-4 (largura total) */
  sm:left-auto sm:right-4           /* Desktop: mantém canto inferior-direito */
  z-50
  flex flex-col-reverse gap-2
  items-stretch                     /* Mobile: full-width */
  sm:items-end                      /* Desktop: alinhado à direita */
  pointer-events-none
">
  {toasts.map(toast => (
    <div key={toast.id} className="pointer-events-auto max-w-sm w-full sm:w-auto">
      <ToastComponent {...toast} />
    </div>
  ))}
</div>
```

**Também melhoraria Desktop?** Desktop mantém o comportamento atual (canto inferior-direito). A mudança só afeta <640px.

**Skill a consultar:** `selective-attention`, `doherty-threshold`

---

### PROBLEMA 6 (ALTO): Sem Scroll-Lock no Body ao Abrir Modais

**Onde no código:** Nenhum mecanismo de travar scroll do body quando modais estão abertos.

**Lei UX: Cognitive Load + Postel's Law**

**Cognitive Load** (skill: `cognitive-load`): scroll bleed é uma distração extrínseca que consome recursos cognitivos sem agregar valor ao conteúdo do modal. **Postel's Law** (skill: `postels-law`): mobile browsers têm comportamentos variados (pull-to-refresh, rubber-band scroll, scroll bounce) — devemos ser tolerantes com esses inputs e prevenir conflitos.

**Recomendação concreta:**

```tsx
// Hook reutilizável
function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;
    const body = document.body;

    // Travamento
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    // Overscroll contain no html
    document.documentElement.style.overscrollBehavior = 'ignore';

    return () => {
      // Restauração
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

// Uso:
function BookDetailsModal({ isOpen, onClose, children }) {
  useBodyScrollLock(isOpen);
  // ... render modal
}
```

**Também melhoraria Desktop?** Sim — previne scroll acidental em qualquer plataforma quando modal está aberto.

**Skill a consultar:** `cognitive-load`, `postels-law`

---

### PROBLEMA 7 (MÉDIO): Input de Busca com min-width 240px

**Onde no código:** Library search input com `min-width: 240px`. Em 360px com padding `px-6` (24px cada lado = 48px), sobram apenas 312px — o input consome 240px, deixando 72px para o filtro de formato e toggle de visualização.

**Lei UX: Fitts's Law + Miller's Law**

**Fitts's Law** (skill: `fittss-law`): alvos menores e mais distantes são mais difíceis de tocar. Os botões de filtro e visualização ficam comprimidos, reduzindo seus touch targets. **Miller's Law** (skill: `millers-law`): a barra de busca com seus elementos adjacentes forma um "chunk" visual. Quando os itens se sobrepõe ou ficam ilegíveis, o chunk se fragmenta e sobrecarrega a memória de trabalho.

**Recomendação concreta:**

```tsx
// Barra de busca responsiva

<div className="flex items-center gap-2 w-full">
  <div className="relative flex-1 min-w-0">  {/* min-w-0 permite encolher */}
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="search"
      placeholder="Buscar livros..."
      className="pl-9 pr-3 w-full"
      style={{ minWidth: 0 }} /* Remove min-width nativo */
    />
  </div>

  {/* Filtro de formato: esconde label no mobile */}
  <Select>
    <SelectTrigger className="w-auto sm:w-[120px] shrink-0">
      <Filter className="sm:hidden h-4 w-4" /> {/* Só ícone no mobile */}
      <span className="hidden sm:inline">Formato</span>
    </SelectTrigger>
  </Select>

  {/* Toggle de visualização */}
  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
    <LayoutGrid className="h-4 w-4" />
  </Button>
</div>
```

**Também melhoraria Desktop?** Sim — `flex-1` com `min-w-0` é mais resiliente em qualquer viewport.

**Skill a consultar:** `fittss-law`, `millers-law`

---

### PROBLEMA 8 (MÉDIO): Sem viewport-fit=cover nem Safe Area Insets

**Onde no código:** Meta viewport sem `viewport-fit=cover`. Conteúdo não respeita safe area insets.

**Lei UX: Cognitive Load + Jakob's Law**

**Jakob's Law** (skill: `jakobs-law`): usuários de iPhones e Androids modernos esperam que apps e sites respeitem as áreas seguras ao redor da câmera punch-hole e barra inferior do sistema. **Cognitive Load** (skill: `cognitive-load`): conteúdo coberto por elementos do sistema (notch, Dynamic Island, barra de gestos) é perda extrínseca — o usuário precisa compensar mentalmente.

**Recomendação concreta:**

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
/* CSS global */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

/* Header respeita safe area */
header {
  padding-top: var(--sat);
}

/* Footer/bottom bar respeita safe area */
footer, .bottom-nav {
  padding-bottom: var(--sab);
}

/* RSVP reader considera viewport real */
.rsvp-container {
  min-height: 100dvh; /* dynamic viewport height, ignora chrome do browser */
  /* Alternativa: */
  min-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}
```

**Também melhoraria Desktop?** `env()` retorna 0px quando não há safe areas — zero impacto em desktop. `100dvh` melhora a experiência em todos os dispositivos com chrome de browser.

**Skill a consultar:** `cognitive-load`, `jakobs-law`

---

## 3. O Que Já Funciona Bem no Mobile

Reconhecer padrões positivos é importante para evitar regressões e servir de base para futuras decisões:

| Padrão | Lei UX que valida | Por que funciona |
|--------|-------------------|------------------|
| **Touch CSS media query** para hover-reveal | Fitts's Law | Garante que elementos hover também funcionam via toque |
| **Format filter bar com scroll horizontal** | Postel's Law + Jakob's Law | Padrão nativo mobile — usuários reconhecem e sabem usar |
| **Grid responsivo (1→4 colunas)** | Miller's Law + Cognitive Load | Chunking progressivo — adapta informação à capacidade visual |
| **Stats banner empilha verticalmente** | Law of Proximity | Mantém agrupamento lógico mesmo em layout colunar |
| **BookDetailsModal empilha verticalmente** | Law of Uniform Connectedness | Relações semânticas preservadas via hierarquia visual |
| **Escape key para fechar modais** | Postel's Law | Múltiplas vias de interação — tolerância com diferentes inputs |
| **13 classes responsivas existentes** | — | Base mínima para expansão (mas insuficiente — ver problemas acima) |

---

## 4. Plano de Ação Priorizado

### Fase 1 — Fundação (Esforço Baixo, Alto Impacto)
*Estimativa: 1-2 dias*

| # | Tarefa | Problema | Skill |
|---|--------|----------|-------|
| 1 | Adicionar `viewport-fit=cover` ao meta tag | #8 | `jakobs-law` |
| 2 | Implementar `useBodyScrollLock` em todos os modais | #6 | `cognitive-load` |
| 3 | Corrigir toast para full-width no mobile | #5 | `selective-attention` |
| 4 | Aplicar `clamp(24px, 8vw, Xpx)` no RSVP font | #1 | `cognitive-load` |
| 5 | Adicionar `overscroll-behavior: contain` em modais e RSVP | #6 | `postels-law` |

### Fase 2 — Layout Crítico (Esforço Médio)
*Estimativa: 3-5 dias*

| # | Tarefa | Problema | Skill |
|---|--------|----------|-------|
| 6 | Refatorar footer RSVP para grid vertical no mobile | #2 | `fittss-law` |
| 7 | Implementar bottom-sheet responsivo para modais | #4 | `jakobs-law` |
| 8 | Flexibilizar input de busca (min-width: 0 + flex-1) | #7 | `fittss-law` |

### Fase 3 — Interação Avançada (Esforço Alto)
*Estimativa: 5-8 dias*

| # | Tarefa | Problema | Skill |
|---|--------|----------|-------|
| 9 | Implementar swipe gestures no RSVP reader | #3 | `fittss-law` |
| 10 | Adicionar tutorial de gestos na primeira visita | #3 | `paradox-of-the-active-user` |
| 11 | `prefers-reduced-motion` para todas as animações | Extra | `cognitive-load` |

### Impacto Esperado por Fase

```
Fase 1 (1-2d): ████████████████████░░░░░ 80% da fricção mobile resolvida
Fase 2 (3-5d): █████████████████████████ 95% da fricção mobile resolvida
Fase 3 (5-8d): ██████████████████████████ 100% (excelência mobile)
```

### Nota sobre `min-h-screen` no RSVP

O RSVP usa `min-h-screen` (100vh) que não contabiliza a chrome do browser mobile. Substituir por `min-h-dvh` (dynamic viewport height) em todos os outputs é um fix que deve ir junto com a Fase 1, pois afeta diretamente a experiência de leitura. Se `dvh` não for suportado nos browsers-alvo, usar a abordagem com `100vh` e CSS custom property com fallback:

```css
.rsvp-container {
  min-height: 100vh;
  min-height: 100dvh; /* fallback moderno */
}
```

---

*Relatório gerado com base nas skills UX do projeto: `laws-of-ux`, `fittss-law`, `hicks-law`, `cognitive-load`, `millers-law`, `doherty-threshold`, `peak-end-rule`, `postels-law`, `jakobs-law`, `selective-attention`, `pareto-principle`.*
