import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Maximize2, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { calculateORP, calculateDwellTime } from '../../engine/orp.js';
import { TargetCrosshair } from '../Reader/TargetCrosshair.jsx';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export function MiniPlayerModal({ 
  isOpen, 
  onClose, 
  book, 
  tokens = [], 
  chapters = [],
  initialIndex = 0, 
  onOpenFull,
  onSaveProgress,
  settings 
}) {
  if (!isOpen || !book) return null;

  const panelRef = useFocusTrap(isOpen);
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(book.lastWpm || 350);

  useEscapeKey(() => {
    if (isOpen) handleClose();
  });

  const timerRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const scheduleNext = useCallback(() => {
    if (!isPlayingRef.current) return;
    if (currentIndexRef.current >= tokens.length - 1) {
      setIsPlaying(false);
      return;
    }

    const cur = tokens[currentIndexRef.current] || '';
    const prv = currentIndexRef.current > 0 ? tokens[currentIndexRef.current - 1] : '';
    const analysis = calculateORP(cur, prv, settings.adaptiveDwell !== false, settings.syntacticWrapup !== false);
    const dwell = calculateDwellTime(wpm, analysis.pauseMultiplier);

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        currentIndexRef.current = next;
        return next;
      });
      scheduleNext();
    }, dwell);
  }, [tokens, wpm, settings]);

  const togglePlay = () => {
    if (isPlayingRef.current) {
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      if (currentIndexRef.current >= tokens.length - 1) {
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
      scheduleNext();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    onSaveProgress(currentIndex, tokens.length, wpm);
    onClose();
  };

  const curWord = tokens[currentIndex] || '';
  const prvWord = currentIndex > 0 ? tokens[currentIndex - 1] : '';
  const orpData = calculateORP(curWord, prvWord, settings.adaptiveDwell !== false, settings.syntacticWrapup !== false);

  const currentChapter = chapters.find(
    ch => currentIndex >= ch.startIndex && currentIndex < ch.endIndex
  ) || chapters[0] || { title: 'Texto Principal' };

  return (
<div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm os-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mini-player-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-md dark:bg-ink-900 bg-white dark:border-ink-700 border-paper-200 border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col os-sheet-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle do Bottom-Sheet (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full dark:bg-ink-600 bg-paper-300" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 dark:border-ink-700 border-paper-200 dark:border-b border-b dark:bg-ink-950/60 bg-paper-50/60">
          <div className="min-w-0 pr-3">
            <h3 id="mini-player-title" className="font-bold text-sm dark:text-paper-50 text-ink-900 truncate font-display">{book.title}</h3>
            <div className="flex items-center gap-2 text-[11px] dark:text-paper-400 text-ink-500 mt-0.5">
              <span className="truncate max-w-[180px] text-brand-400 font-medium">{currentChapter.title}</span>
              <span>•</span>
              <span className="font-mono">{currentIndex} / {tokens.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                handleClose();
                onOpenFull(book.id);
              }}
              className="p-2 rounded-lg dark:text-paper-400 text-ink-500 dark:hover:text-paper-50 hover:text-ink-900 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
              title="Expandir para Leitor Completo"
              aria-label="Expandir para leitor completo"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg dark:text-paper-400 text-ink-500 dark:hover:text-paper-50 hover:text-ink-900 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor Rápido de Capítulos no Mini-Player (se houver mais de 1 capítulo) */}
        {chapters.length > 1 && (
          <div className="px-4 py-1.5 dark:bg-ink-950/40 bg-paper-50/40 dark:border-b dark:border-ink-700/60 border-b border-paper-200/60 flex items-center gap-2 text-xs">
            <Bookmark className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <select
              value={currentChapter.startIndex}
              onChange={(e) => {
                const newIdx = Number(e.target.value);
                setCurrentIndex(newIdx);
              }}
              className="w-full bg-transparent dark:text-paper-300 text-ink-600 text-xs focus:outline-none truncate cursor-pointer"
            >
              {chapters.map((ch, idx) => (
                <option key={ch.id || idx} value={ch.startIndex} className="dark:bg-ink-900 bg-white dark:text-paper-200 text-ink-800">
                  {idx + 1}. {ch.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mini RSVP Stage */}
        <div className="relative h-36 dark:bg-ink-950 bg-paper-50 flex items-center justify-center px-4">
          <TargetCrosshair accentColor={settings.accentColor || '#ef4444'} />

          <div 
            className="w-full flex items-baseline font-mono tracking-tight select-none"
            style={{ 
              fontFamily: settings.fontFamily,
              fontSize: `min(${settings.fontSize || 30}px, calc((100vw - 64px) / 12))`
            }}
          >
            <span className="flex-1 text-right opacity-90 truncate pr-0.5 dark:text-paper-200 text-ink-800">{orpData.prefix}</span>
            <span 
              className="shrink-0 font-black text-center" 
              style={{ color: settings.accentColor || '#ef4444', minWidth: '0.85ch' }}
            >
              {orpData.focalChar || ' '}
            </span>
            <span className="flex-1 text-left opacity-90 truncate pl-0.5 dark:text-paper-200 text-ink-800">{orpData.suffix}</span>
          </div>
        </div>

        {/* Controles do Mini-Player */}
        <div className="p-4 dark:bg-ink-900 bg-white dark:border-t dark:border-ink-700 border-t border-paper-200 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="font-bold" style={{ color: settings.accentColor || '#ef4444' }}>{wpm}</span>
            <span className="dark:text-paper-500 text-ink-400">WPM</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 10))}
              className="p-2 rounded-xl dark:border-ink-700 border-paper-200 dark:hover:bg-ink-800 hover:bg-paper-100 dark:text-paper-300 text-ink-600 transition"
              title="Voltar 10 palavras"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 text-white rounded-xl shadow-md transition"
              style={{ backgroundColor: settings.accentColor || '#ef4444' }}
              title="Play / Pause"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(tokens.length - 1, prev + 10))}
              className="p-2 rounded-xl dark:border-ink-700 border-paper-200 dark:hover:bg-ink-800 hover:bg-paper-100 dark:text-paper-300 text-ink-600 transition"
              title="Avançar 10 palavras"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              handleClose();
              onOpenFull(book.id);
            }}
            className="text-xs font-medium hover:underline"
            style={{ color: settings.accentColor || '#ef4444' }}
          >
            Expandir
          </button>
        </div>
      </div>
    </div>
  );
}
