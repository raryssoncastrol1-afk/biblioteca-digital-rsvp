# Estante em Grade 2 Colunas no Mobile — Plano de Implementação

> **Para Hermes:** executar com a skill `subagent-driven-development`, task a task, com revisão de spec e qualidade após cada task.

**Goal:** No modo **Grade** da estante do Projeto Biblioteca, em telas de celular, mostrar **2 livros por fileira** (com capas verticalizadas, como livros físicos) em vez de 1 livro por fileira.

**Architecture:** Mudança de layout puramente no componente `LibraryView.jsx` — trocar o wrapper `grid-cols-1` por `grid-cols-2` no breakpoint mobile, e ajustar o `BookCard` para exibir a capa em proporção vertical (portrait 2:3) em vez da atual `h-48` (paisagem). Nenhuma mudança de estado, dados, parsers ou testes de lógica — apenas classes e estilos.

**Tech Stack:** React 18, Tailwind CSS (JIT), esbuild. Nenhuma nova dependência.

---

## Contexto Atual (verificado)

- **Arquivo alvo:** `src/components/Library/LibraryView.jsx`
  - Linha 322: `viewMode === 'grid'` renderiza `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">` — no mobile usa `grid-cols-1` (1 coluna).
- **Componente de card:** `src/components/Library/BookCard.jsx`
  - Capa atual: `<div className="relative h-48 ...">` (linha 25) — altura fixa 192px, largura = coluna inteira (paisagem/quadrada). Em `grid-cols-2` com `h-48` a capa ficaria muito "achatada" e o texto embaixo cortado.
  - Estrutura: capa no topo (`h-48`), bloco de info `p-4` (título, autor, métricas, progresso).
- **Modos existentes:** `grid` (este), `list` (`BookList`, 1 por linha) e `table` (`BookTable`). O toggle de view é `viewMode` (estado local, funciona).
- **Comando build:** `npm run build` → `public/reader.bundle.js` (esbuild via `build.js`, ~350ms).
- **Testes:** `npm test` = `node test/engine.test.js && node test/parsers.test.js` (assert puro; não cobrem componentes React).

## Objetivos

1. No mobile (`< 640px`), o modo Grade mostra **exatamente 2 colunas** de capas, com capas em **proporção vertical (portrait)** — o usuário vê "duas capas de livro lado a lado", como estante física.
2. Em `sm+`, o layout mantém o comportamento atual (2→3→4 colunas).
3. Não quebrar: leitura, mini player, detalhes, exclusão, buscas/filtros, `list` e `table`.
4. Build passa (`npm run build`), testes passam (`npm test`), e verificação no celular via LAN.

---

## Tarefas

### Task 1 — Grid de 2 colunas no mobile + ajuste de responsividade

**Objetivo:** o wrapper do modo Grade usa 2 colunas a partir do mobile.

**Arquivo:** Modificar `src/components/Library/LibraryView.jsx:322`

**Mudança:**

```jsx
{/* de */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
{/* para — 2 colunas desde mobile base */}
<div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

- `grid-cols-2` no mobile base; `gap-4` no mobile (menos espaço entre capas) e `sm:gap-6` em telas maiores.
- **Nota (decisão de escopo):** em `sm` continua **2 colunas** (`sm:grid-cols-2` é redundante com o base, mas explícito e sem surpresa). Se o usuário quiser 3 desde tablet, ajustar `sm:grid-cols-3`.

**Verify:**
- `npm run build` passa sem erro.
- No browser (devtools mobile 375px): 2 colunas visíveis no Grade.

**Commit:** `feat(shelf): grid 2 colunas no mobile`

---

### Task 2 — Capa vertical (portrait) no BookCard mobile

**Objetivo:** a capa do card fica em proporção vertical (2:3, como livro físico) em vez de altura fixa achatada — sem quebrar o texto embaixo.

**Arquivo:** Modificar `src/components/Library/BookCard.jsx:25`

**Mudança:**

```jsx
{/* de */}
<div className="relative h-48 dark:bg-ink-950 bg-paper-50 flex items-center justify-center overflow-hidden border-b dark:border-ink-700 border-paper-200">

{/* para — altura mínima proporcional, capa se comporta como objeto vertical */}
<div className="relative aspect-[2/3] sm:aspect-auto sm:h-48 dark:bg-ink-950 bg-paper-50 flex items-center justify-center overflow-hidden border-b dark:border-ink-700 border-paper-200">
```

- No mobile: `aspect-[2/3]` força capa **portrait** (largura da coluna → altura 1.5x).
- Em `sm+`: volta a `h-48` fixa (comportamento atual em desktop).
- O `img` já usa `object-cover` — vai preencher o novo retângulo corretamente. Sem capa (placeholder `BookOpen`) já é flex-centered.

**Nota (edge case):** com `aspect-[2/3]`, em telas muito estreitas a capa fica alta mas a largura é a da coluna (~150px → altura ~225px), o que mantém o card razoável. O bloco de info (`p-4`) abaixo continua com título/autor/métricas/progresso.

**Verify:**
- `npm run build` passa.
- No devtools mobile: capas com proporção 2:3, texto embaixo legível e não cortado.

**Commit:** `feat(shelf): capa vertical portrait no card mobile`

---

### Task 3 — Revisão visual do card em 2 colunas (densidade de info)

**Objetivo:** garantir que o texto do card em coluna estreita (~150-170px) não se estoure nem quebre o layout.

**Arquivo:** Modificar `src/components/Library/BookCard.jsx` (ajustes finos)

**Ajustes (se necessário, após inspeção visual):**
- Título: já usa `line-clamp-1` e `truncate` — ok em coluna estreita.
- Métricas: `flex items-center justify-between` (linha 108) — com 3 itens (palavras, min, índice), em ~150px pode apertar. Garantir `flex-wrap` ou esconder o "min" no mobile se estourar.
  - Sugestão: adicionar `flex-wrap` à linha de métricas, e se ainda apertar, `hidden sm:flex` no item de "~X min".
- Progresso: barra `w-full` + texto `progress% lido / WPM` — ok.
- Botões hover (Ler/olhinho/info): no mobile ficam `opacity-0 group-hover:opacity-100`; em touch não há hover — **garantir que o botão principal "Ler" fica sempre visível** (já está fora do `opacity-0`, na barra inferior — confirmar que permanece).

**Verify:**
- No devtools mobile 320px e 375px: título truncado corretamente, métricas não estouram a largura, botão "Ler" visível e clicável, sem scroll horizontal.

**Commit:** `fix(shelf): densidade de info no card 2-col mobile`

---

### Task 4 — Melhorar a visualização em Lista (novo)

**Objetivo:** corrigir os problemas visuais do modo `list` identificados na análise (alinhamento, hierarquia, contraste, capas pequenas/inconsistentes, botões soltos) — deixando a lista agradável e coerente, sem virar grade.

**Arquivo:** Modificar `src/components/Library/BookList.jsx` (estrutura do card-linha)

**Problemas identificados (da análise visual do usuário):**
1. **Capa pequena e formato inconsistente** (alguns livros retrato, outros quadrados/brancos) → capa perde função de identificação.
2. **Alinhamento vertical quebrado** entre capa, texto, badge e botões dentro da linha (cada card parece desalinhado).
3. **Hierarquia de texto ausente**: título e autor mesmo tamanho; percentual de progresso no mesmo nível das stats (palavras/min).
4. **Contraste baixo**: badges (PDF/EPUB) escuros sobre fundo escuro; texto secundário cinza-claro quase invisível; lixeira branca sumida.
5. **Botões de ação dispersos/soltos**, desconectados do bloco principal, com ícones pequenos e posição vertical inconsistente.
6. **Barra de progresso fina e difícil de ver**; percentual deslocado, não associado à ponta da barra.

**Mudança proposta (redesenho do card-linha estilo **Apple Books**, mantendo o dark/ink do app):**
- **Sem cards por linha** — estilo Apple: linhas separadas por divisor fino (`divide-y dark:divide-ink-800/50`), sem caixa/borda arredondada em cada item. A lista fica limpa e scaneável.
- **Linha:** `group flex items-center gap-4 px-1 py-3.5`, clicável (abre detalhes).
- **Capa:** proporção fixa **2:3** `w-16 h-24 shrink-0 rounded-lg object-cover shadow-lg shadow-ink-950/40 ring-1 ring-ink-700/30` (sombra + borda sutil, como as capas no Apple Books). Placeholder `BookOpen` centralizado quando não há capa.
- **Bloco de info** (`flex-1 min-w-0`):
  - **Título** `font-semibold text-[15px] dark:text-paper-50 line-clamp-1` — maior, peso semibold (hierarquia clara sobre o autor).
  - **Autor** `text-[13px] dark:text-paper-400 truncate` — secundário, cinza.
  - Badge de formato discreto (opcional): `text-[10px]` ao lado do título, borda fina, baixo contraste (não compete com o título).
- **Progresso:** linha fina abaixo do autor — barra `w-24 h-1 dark:bg-ink-800 rounded-full` com fill `bg-brand-500`, e `%` em `text-[11px] font-mono` logo à direita da barra (associado, não deslocado).
- **Ações** (`shrink-0 flex items-center gap-0.5`), à direita, discretas e alinhadas ao centro:
  - Ícones de olho (mini player) e detalhes/índice: `p-2 text-ink-400 hover:text-brand-400 transition` (ícones pequenos, quietos).
  - **Ler/Continuar** como *text-button* tranquilo (estilo Apple): `flex items-center gap-1 text-[13px] font-semibold text-brand-400` com ícone Play pequeno — sem fundo preenchido, sem briga visual com a capa.
  - Lixeira: `p-2 text-ink-400 hover:text-red-400` (visível, discreta).
- **Contraste:** tudo apoiado nos tokens atuais (`paper-50/400`, `ink-400`, `brand-400`) — sem cinza-claro sumido; os ícones ganham `text-ink-400` base (não branco).

**Nota (princípio):** a lista deve ser *scaneável verticalmente* — olho desce a tela e identifica cada livro rápido. Capa à esquerda + texto à direita, alinhamento firme (eixo único), e ações quietas que não competem com a capa — exatamente o que o Apple Books faz.

**Verify:**
- `npm run build` passa.
- No devtools mobile 375px (modo lista): capas `w-14 h-20` consistentes, título > autor, barra + % alinhados, ações agrupadas e alinhadas, contraste OK, sem scroll horizontal.
- Comparar com a captura atual do usuário: os 6 problemas acima resolvidos.

**Commit:** `feat(shelf): redesenho do card-lista com hierarquia e alinhamento`

---

### Task 5 — Verificação manual no celular via LAN

**Objetivo:** validar as mudanças (Grade 2 col e Lista redesenhada) no dispositivo real.

**Procedimento:**
1. `npm run build` + subir servidor ouvindo em **0.0.0.0**: `npm run dev` (servidor da porta 3000).
2. Informar ao usuário o **IP LAN** (ex.: `http://192.168.1.2:3000`) para abrir no celular.
3. Verificar no celular: estante em **Grade** mostra 2 capas por fileira verticalizadas; **Lista** mostra cards alinhados e legíveis; botões de toggle funcionam; busca/filtros funcionam.

**Verify:** o usuário confirma no celular que Grade 2 col e Lista melhorada estão funcionais e agradáveis.

---

## Testes / Validação

- `npm test` — deve continuar passando (nenhuma lógica alterada; assert puro não cobre React).
- `npm run build` — deve passar (esbuild, ~350ms).
- Verificação visual nos breakpoints: 320px (2 col), 375px (2 col), 640px+ (2 col), 768px (3 col), 1024px+ (4 col).
- Verificação no celular real via LAN (Task 4).

## Riscos / Tradeoffs / Perguntas Abertas

- **Risco: texto apertado em coluna estreita.** Mitigação na Task 3 (flex-wrap, esconder "min" no mobile se necessário).
- **Risco: botões hover invisíveis em touch.** Já tratado no código atual (o "Ler" fica sempre visível); confirmar na Task 3/4.
- **Decisão:** em `sm+` mantive 2 colunas. Se preferir 3 desde tablet, basta `sm:grid-cols-3`.
- **Escopo:** mudança é 100% de apresentação. Nenhum dado, parser ou store é tocado.
- **Pergunta:** o usuário quer que a mudança valha **só no mobile** (até 640px) e desktop continue como está? (Sim, por padrão — pode confirmar.) Ou prefere grade de 2 colunas em todas as telas?

## Arquivos Alterados (resumo)

- `src/components/Library/LibraryView.jsx` — wrapper do grid (linha 322)
- `src/components/Library/BookCard.jsx` — capa portrait + ajustes de densidade (linhas 25, 108)