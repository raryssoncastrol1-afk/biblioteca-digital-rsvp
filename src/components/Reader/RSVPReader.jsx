import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, 
  Maximize2, Minimize2, BookOpen, Sliders, ArrowLeft,
  SkipBack, SkipForward, Bookmark
} from 'lucide-react';
import { calculateORP, calculateDwellTime } from '../../engine/orp.js';
import { TargetCrosshair } from './TargetCrosshair.jsx';
import { HelpModal } from './HelpModal.jsx';
import { useSwipeGesture } from '../../hooks/useSwipeGesture.js';

export function RSVPReader({
  book,
  tokens = [],
  chapters = [],
  initialIndex = 0,
  onSaveProgress,
  onBackToLibrary,
  onOpenChapters,
  onOpenSettings,
  settings,
  seekIndex = null,
  seekNonce = 0
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(book.lastWpm || 350);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const timerRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const currentIndexRef = useRef(currentIndex);
  const wpmRef = useRef(wpm);
  const settingsRef = useRef(settings);
  const onSaveProgressRef = useRef(onSaveProgress);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { onSaveProgressRef.current = onSaveProgress; }, [onSaveProgress]);

  // Salva o progresso apenas quando posição ou WPM mudam (sem loop: usa ref nunca recrea a callback)
  useEffect(() => {
    onSaveProgressRef.current?.(currentIndex, tokens.length, wpm);
  }, [currentIndex, wpm, tokens.length]);

  // Navegação externa via ChapterModal: salta para o índice requisitado e pausa
  useEffect(() => {
    if (seekIndex === null || seekIndex === undefined) return;
    currentIndexRef.current = seekIndex;
    setCurrentIndex(seekIndex);
    setIsPlaying(false);
    setIsFinished(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [seekIndex, seekNonce]);

  // Palavra atual fatiada em ORP (memoizada — só recalcula quando a palavra/settings mudam)
  const currentWord = tokens[currentIndex] || '';
  const prevWord = currentIndex > 0 ? tokens[currentIndex - 1] : '';

  const orpData = useMemo(() => calculateORP(
    currentWord,
    prevWord,
    settings.adaptiveDwell !== false,
    settings.syntacticWrapup !== false
  ), [currentWord, prevWord, settings.adaptiveDwell, settings.syntacticWrapup]);

  // Capítulo atual (memoizado — a busca é O(n) sobre os capítulos)
  const { currentChapter, currentChapterIndex } = useMemo(() => {
    if (chapters.length === 0) return { currentChapter: { title: 'Texto Principal' }, currentChapterIndex: -1 };
    const idx = chapters.findIndex(
      ch => currentIndex >= ch.startIndex && currentIndex < ch.endIndex
    );
    return {
      currentChapter: chapters[idx >= 0 ? idx : 0],
      currentChapterIndex: idx
    };
  }, [chapters, currentIndex]);

  // Funções para saltar entre capítulos
  const handlePrevChapter = useCallback(() => {
    if (chapters.length === 0) return;
    setIsFinished(false);
    if (currentChapterIndex > 0) {
      setCurrentIndex(chapters[currentChapterIndex - 1].startIndex);
    } else {
      setCurrentIndex(0);
    }
  }, [chapters, currentChapterIndex]);

  const handleNextChapter = useCallback(() => {
    if (chapters.length === 0) return;
    setIsFinished(false);
    if (currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1) {
      setCurrentIndex(chapters[currentChapterIndex + 1].startIndex);
    }
  }, [chapters, currentChapterIndex]);

  // Agendador do próximo frame RSVP
  const scheduleNextWord = useCallback(() => {
    if (!isPlayingRef.current) return;

    if (currentIndexRef.current >= tokens.length - 1) {
      setIsPlaying(false);
      setIsFinished(true);
      return;
    }

    const curWord = tokens[currentIndexRef.current] || '';
    const prvWord = currentIndexRef.current > 0 ? tokens[currentIndexRef.current - 1] : '';
    const analysis = calculateORP(
      curWord, 
      prvWord, 
      settingsRef.current.adaptiveDwell !== false, 
      settingsRef.current.syntacticWrapup !== false
    );

    const dwellMs = calculateDwellTime(wpmRef.current, analysis.pauseMultiplier);

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        currentIndexRef.current = next;
        return next;
      });
      scheduleNextWord();
    }, dwellMs);
  }, [tokens]);

  // Iniciar / pausar
  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      if (currentIndexRef.current >= tokens.length - 1) {
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      }
      setIsFinished(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      scheduleNextWord();
    }
  }, [scheduleNextWord, tokens.length]);

  // Gestos de swipe para mobile (play/pause, avançar, voltar)
  const swipeHandlers = useSwipeGesture({
    onSwipeRight: togglePlay,
    onSwipeLeft: () => setCurrentIndex(prev => Math.min(tokens.length - 1, prev + 10)),
    onDoubleTap: togglePlay
  });

  // Limpeza de timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignora se estiver digitando em inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const stepBack = e.shiftKey ? 1 : 10;
          setCurrentIndex(prev => Math.max(0, prev - stepBack));
          break;
        case 'ArrowRight':
          e.preventDefault();
          const stepForward = e.shiftKey ? 1 : 10;
          setCurrentIndex(prev => Math.min(tokens.length - 1, prev + stepForward));
          break;
        case 'BracketLeft': // [
          e.preventDefault();
          handlePrevChapter();
          break;
        case 'BracketRight': // ]
          e.preventDefault();
          handleNextChapter();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setWpm(prev => Math.min(2000, prev + 25));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setWpm(prev => Math.max(100, prev - 25));
          break;
        case 'KeyC':
          e.preventDefault();
          onOpenChapters();
          break;
        case 'KeyS':
          e.preventDefault();
          onOpenSettings();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyR':
          e.preventDefault();
          setCurrentIndex(0);
          break;
        case 'KeyH':
        case 'Slash':
          e.preventDefault();
          setIsHelpOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, tokens.length, onOpenChapters, onOpenSettings, handlePrevChapter, handleNextChapter]);

  // Alternância de Tela Cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const themeClasses = {
    dark: 'bg-slate-950 text-slate-100',
    oled: 'bg-black text-neutral-100',
    sepia: 'bg-[#fbf0d9] text-[#433422]',
    light: 'bg-slate-50 text-slate-900'
  }[settings.theme] || 'bg-slate-950 text-slate-100';

  const progressPercent = tokens.length > 0 ? (currentIndex / tokens.length) * 100 : 0;
  const wordsRemaining = Math.max(0, tokens.length - currentIndex);
  const minutesRemaining = Math.ceil(wordsRemaining / wpm);

  return (
    <div className={`min-h-screen flex flex-col justify-between select-none ${themeClasses}`} style={{ fontFamily: settings.fontFamily }}>
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-current/10 backdrop-blur-md bg-inherit/70 z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={onBackToLibrary}
            className="p-2 rounded-xl hover:bg-current/10 transition shrink-0" 
            title="Voltar à Estante"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 pr-4">
            <h1 className="font-bold text-sm sm:text-base truncate max-w-xs sm:max-w-md">{book.title}</h1>
            <button 
              onClick={onOpenChapters}
              className="text-xs opacity-60 hover:opacity-100 flex items-center gap-1.5 transition truncate text-left mt-0.5"
              title="Abrir Índice de Capítulos (C)"
            >
              <Bookmark className="w-3 h-3 shrink-0" />
              <span className="truncate">{currentChapter.title}</span>
              {chapters.length > 1 && (
                <span className="text-[10px] opacity-60 font-mono">({currentChapterIndex + 1}/{chapters.length})</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Índice */}
          <button
            onClick={onOpenChapters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-current/20 hover:bg-current/10 text-xs font-semibold transition"
            title="Capítulos e Índice (C)"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden md:inline">Índice</span>
          </button>

          {/* Configurações */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-current/20 hover:bg-current/10 transition"
            title="Configurações & Ergonomia (S)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Tela cheia */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-current/20 hover:bg-current/10 transition"
            title="Tela Cheia (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Ajuda de Atalhos */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="w-9 h-9 rounded-xl border border-current/20 hover:bg-current/10 font-mono font-black text-sm transition"
            title="Atalhos de Teclado (H ou ?)"
          >
            ?
          </button>
        </div>
      </header>

      {/* PALCO CENTRAL RSVP */}
      <main 
        className="flex-1 flex flex-col items-center justify-center relative px-4"
        {...swipeHandlers}
      >
        <div className="relative w-full max-w-2xl h-44 sm:h-56 flex items-center justify-center">
          
          {/* Mira Visual Foveal */}
          <TargetCrosshair accentColor={settings.accentColor || '#ef4444'} />

          {/* Renderização Central Fixada do ORP */}
          <div 
            className="w-full flex items-baseline font-mono tracking-tight leading-none"
            style={{ fontSize: `min(${settings.fontSize || 52}px, calc((100vw - 48px) / 12))` }}
          >
            {/* Prefixo (alinhado à direita do centro) */}
            <span className="flex-1 text-right opacity-90 truncate pr-0.5 select-none">
              {orpData.prefix}
            </span>

            {/* Caractere Focal ORP (fixado no centro da mira) */}
            <span 
              className="shrink-0 font-black text-center select-none drop-shadow-sm" 
              style={{ 
                color: settings.accentColor || '#ef4444',
                minWidth: '0.85ch'
              }}
            >
              {orpData.focalChar || ' '}
            </span>

            {/* Sufixo (alinhado à esquerda do centro) */}
            <span className="flex-1 text-left opacity-90 truncate pl-0.5 select-none">
              {orpData.suffix}
            </span>
          </div>

        </div>

        {/* Indicador de Pausa / Contexto */}
        {!isPlaying && !isFinished && (
          <div className="mt-4 text-xs tracking-wide uppercase opacity-50 font-mono animate-pulse">
            <span className="hidden sm:inline">Pressione Espaço para iniciar ou pausar</span>
            <span className="sm:hidden">Toque duplo para play/pause • Deslize para avançar</span>
          </div>
        )}

        {/* Conclusão da leitura: o desfecho da jornada (Peak–End) */}
        {isFinished && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 os-fade-in">
            {/* Warm radial glow behind completion text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 rounded-full" style={{ background: `radial-gradient(circle, ${(settings.accentColor || '#ef4444')}15 0%, transparent 65%)` }} />
            </div>
            <div className="relative text-center max-w-xl">
              <div className="w-16 h-0.5 mx-auto rounded-full mb-6" style={{ backgroundColor: settings.accentColor || '#ef4444', opacity: 0.4 }} />
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight font-display">Você terminou!</h2>
              <p className="opacity-70 mt-2 truncate max-w-md mx-auto text-sm">{book.title}</p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="px-4 py-3 rounded-2xl border border-current/10 bg-current/5">
                  <div className="text-lg font-black font-mono leading-none">{tokens.length.toLocaleString()}</div>
                  <div className="text-[11px] uppercase tracking-wider opacity-50 mt-1.5">palavras</div>
                </div>
                <div className="px-4 py-3 rounded-2xl border border-current/10 bg-current/5">
                  <div className="text-lg font-black font-mono leading-none">~{Math.max(1, Math.round(tokens.length / wpm))}</div>
                  <div className="text-[11px] uppercase tracking-wider opacity-50 mt-1.5">min lidos</div>
                </div>
                <div className="px-4 py-3 rounded-2xl border border-current/10 bg-current/5">
                  <div className="text-lg font-black font-mono leading-none">{wpm}</div>
                  <div className="text-[11px] uppercase tracking-wider opacity-50 mt-1.5">WPM</div>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    currentIndexRef.current = 0;
                    setCurrentIndex(0);
                    setIsFinished(false);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-current/20 hover:bg-current/10 text-sm font-semibold transition"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Ler novamente
                </button>
                <button
                  onClick={onBackToLibrary}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-bold transition"
                  style={{ backgroundColor: settings.accentColor || '#ef4444' }}
                >
                  <BookOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Voltar à estante
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER & CONTROLES */}
      <footer className="px-6 py-5 border-t border-current/10 backdrop-blur-md bg-inherit/70 space-y-4 z-20">
        
        {/* Barra de Progresso Interativa */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono opacity-60">
            <span>{currentIndex} / {tokens.length} palavras ({Math.round(progressPercent)}%)</span>
            <span>~{minutesRemaining} min restantes</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(0, tokens.length - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full h-1.5 bg-current/20 rounded-lg cursor-pointer"
            style={{ accentColor: settings.accentColor || '#ef4444' }}
          />
        </div>

        {/* Barra de Controles Principais */}
        <div className="space-y-4">
          
          {/* Linha Principal: Playback (sempre visível e centralizado) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 10))}
              className="p-3 rounded-xl border border-current/20 hover:bg-current/10 transition"
              title="Retroceder 10 palavras (Seta Esquerda)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="p-4 rounded-2xl text-white shadow-lg transition transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: settings.accentColor || '#ef4444', boxShadow: `0 10px 20px -8px ${(settings.accentColor || '#ef4444')}66` }}
              title="Play / Pause (Espaço)"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(tokens.length - 1, prev + 10))}
              className="p-3 rounded-xl border border-current/20 hover:bg-current/10 transition"
              title="Avançar 10 palavras (Seta Direita)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Linha Secundária: WPM + Navegação (empilhado em mobile, lado a lado em desktop) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Seletor de Velocidade (WPM) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWpm(prev => Math.max(100, prev - 25))}
                className="px-3 py-2 rounded-lg border border-current/20 hover:bg-current/10 text-xs font-mono font-bold"
                title="Diminuir velocidade (-25 WPM)"
              >
                −25
              </button>

              <div className="flex flex-col items-center px-1">
                <span className="text-xl font-mono font-black tracking-tight leading-none">{wpm}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60 font-semibold mt-0.5">WPM</span>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="25"
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  className="w-24 h-1 mt-1.5 bg-current/20 rounded-lg cursor-pointer"
                  style={{ accentColor: settings.accentColor || '#ef4444' }}
                  title="Ajustar velocidade"
                />
              </div>

              <button
                onClick={() => setWpm(prev => Math.min(2000, prev + 25))}
                className="px-3 py-2 rounded-lg border border-current/20 hover:bg-current/10 text-xs font-mono font-bold"
                title="Aumentar velocidade (+25 WPM)"
              >
                +25
              </button>
            </div>

            {/* Separador visual (só em desktop) */}
            <div className="hidden sm:block w-px h-6 bg-current/10" />

            {/* Navegação Auxiliar: capítulos e reinício */}
            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition">
              <button
                onClick={handlePrevChapter}
                disabled={currentChapterIndex <= 0}
                className="p-2.5 rounded-xl border border-current/20 hover:bg-current/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Capítulo Anterior ( [ )"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={handleNextChapter}
                disabled={currentChapterIndex >= chapters.length - 1}
                className="p-2.5 rounded-xl border border-current/20 hover:bg-current/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Próximo Capítulo ( ] )"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentIndex(0)}
                className="p-2.5 rounded-xl border border-current/20 hover:bg-current/10 transition"
                title="Reiniciar Leitura do Início (R)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* Painel de Ajuda de Atalhos */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

    </div>
  );
}
