# ⚡ Biblioteca Digital & Leitor RSVP Focus

> **Plataforma PWA de alta performance para leitura acelerada, ergonomia visual e gestão offline de acervos digitais.**

![Node.js](https://img.shields.io/badge/Node.js-20+-68a063?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8?style=flat-square&logo=tailwind-css)
![esbuild](https://img.shields.io/badge/Bundler-esbuild-ffcf00?style=flat-square&logo=esbuild)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB_Offline--First-indigo?style=flat-square)
![WASM](https://img.shields.io/badge/OCR-WebAssembly_Tesseract-orange?style=flat-square)

---

## 📖 Visão Geral

A **Biblioteca Digital & Leitor RSVP Focus** resolve o problema da fadiga ocular e da lentidão na leitura tradicional em telas através da tecnologia **RSVP (*Rapid Serial Visual Presentation*)** sincronizada com o **ORP (*Optimal Recognition Point*)**, permitindo leituras confortáveis de **200 a mais de 1000 palavras por minuto** com máxima retenção.

Além do leitor acelerado, a aplicação conta com uma **Estante Digital Multiformato** e arquitetura **Offline-First**, permitindo armazenar e ler livros diretamente no navegador sem depender de conexão contínua com a internet.

---

## 🚀 Principais Recursos

### 🎯 1. Motor RSVP & Ponto Ótimo de Reconhecimento (ORP)
- **Fixação Foveal Centralizada:** O ponto de fixação óptico é calculado matematicamente (`Math.floor((len - 1) / 3)`), mantendo o caractere de foco perfeitamente alinhado na mira visual, eliminando o gasto de tempo com movimentos sacádicos dos olhos.
- **Dwell-Time Adaptativo Cognitivo:**
  - Nomes Próprios e Siglas: `+38%`
  - Termos Longos e Complexos (>10 letras): `+45%`
  - Palavras Curtas Funcionais (≤3 letras): `-12%` (para maior fluência)
  - Numerais e Estrangeirismos: `+40%`
- **Wrap-up Sintático:** Pausas reflexivas proporcionais no final de períodos (`.!?` → `1.85x`) e vírgulas/pausas (`:,;—` → `1.35x`).

### 🧬 2. Modo Leitura Biônica (*Bionic Reading*)
- Alternância em tempo real com a tecla <kbd>M</kbd> para leitura em bloco com fixação artificial e destaque em negrito nos prefixos das palavras.
- Navegação interativa: clique em qualquer palavra do texto biônico para retomar a leitura RSVP exatamente daquele ponto.

### 📚 3. Estante Digital Multiformato & Parsers no Cliente
- Suporte nativo a **EPUB, PDF, DOCX, TXT, MD, MOBI e AZW3**.
- **Extração Vetorial & OCR WebAssembly:** Processamento de PDFs via *Mozilla PDF.js* com fallback inteligente para *Tesseract.js (WASM)* para extração de textos em PDFs escaneados.
- **3 Modos de Visualização:** Grade (*cards* com capas e métricas), Lista detalhada e Tabela.
- **Mini-Player RSVP Modal:** Permite degustar e ler rapidamente qualquer documento diretamente da estante.

### 💾 4. Arquitetura 100% Offline-First
- Persistência assíncrona robusta via **IndexedDB** (`BibliotecaRSVP_DB` e `RSVP_Reader_Docs_DB`) e Service Worker PWA (*Network-First* com fallback offline).
- Armazenamento local de metadados, capas, progresso percentual, último WPM e histórico de leitura.

### 👁️ 5. Ergonomia Visual & Tipografia Científica
- Fontes otimizadas para leitura e acessibilidade: **Atkinson Hyperlegible**, **Lexend** e **OpenDyslexic**.
- 4 temas visuais: **AMOLED Preto**, **Slate Escuro**, **Sépia Suave** e **Luz Diurna**.
- Cores personalizáveis para a mira foveal (Vermelho Foveal, Âmbar Dourado, Verde Esmeralda, Ciano Neônio, Púrpura).

---

## ⌨️ Atalhos de Teclado no Leitor

| Tecla | Ação |
| :---: | :--- |
| <kbd>Espaço</kbd> | Play / Pausar reprodução RSVP |
| <kbd>←</kbd> / <kbd>→</kbd> | Retroceder / Avançar 10 palavras (<kbd>Shift</kbd> + Seta: 1 palavra) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Aumentar / Reduzir velocidade (+25 / -25 WPM) |
| <kbd>C</kbd> | Abrir modal de Capítulos e Índice |
| <kbd>S</kbd> | Abrir Configurações Científicas e Temas |
| <kbd>M</kbd> | Alternar entre Leitura RSVP e Modo Biônico |
| <kbd>F</kbd> | Alternar Modo Tela Cheia |
| <kbd>R</kbd> | Reiniciar leitura do documento |

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 18, Tailwind CSS, Lucide Icons.
- **Processamento no Cliente:** PDF.js, JSZip, Tesseract.js (WASM).
- **Armazenamento:** IndexedDB API + LocalStorage com fallback resiliente em memória.
- **Backend / Servidor:** Node.js, Express, Multer.
- **Bundler & Build:** `esbuild` para compilação instantânea em sub-segundos.

---

## 📦 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU_USUARIO/biblioteca-digital-rsvp.git
cd biblioteca-digital-rsvp
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Executar os testes automatizados
```bash
npm test
```

### 4. Compilar os bundles
```bash
npm run build
```

### 5. Iniciar o servidor
```bash
npm start
```
Acesse a aplicação no navegador em: **[http://localhost:3000](http://localhost:3000)**

---

## 🌐 Deploy

### Deploy no Vercel
O projeto já conta com o arquivo `vercel.json` configurado:
1. Conecte seu repositório do GitHub na [Vercel](https://vercel.com).
2. Configure o Build Command como `npm run build` e o Output Directory como `public`.
3. Clique em **Deploy**.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
