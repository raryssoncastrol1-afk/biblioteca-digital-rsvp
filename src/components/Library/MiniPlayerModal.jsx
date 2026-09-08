import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Maximize2, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { calculateORP, calculateDwellTime } from '../../engine/orp.js';
import { TargetCrosshair } from '../Reader/TargetCrosshair.jsx';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="min-w-0 pr-3">
            <h3 className="font-bold text-sm text-slate-100 truncate">{book.title}</h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="truncate max-w-[180px] text-indigo-400 font-medium">{currentChapter.title}</span>
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Expandir para Leitor Completo"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seletor Rápido de Capítulos no Mini-Player (se houver mais de 1 capítulo) */}
        {chapters.length > 1 && (
          <div className="px-4 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 text-xs">
            <Bookmark className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={currentChapter.startIndex}
              onChange={(e) => {
                const newIdx = Number(e.target.value);
                setCurrentIndex(newIdx);
              }}
              className="w-full bg-transparent text-slate-300 text-xs focus:outline-none truncate cursor-pointer"
            >
              {chapters.map((ch, idx) => (
                <option key={ch.id || idx} value={ch.startIndex} className="bg-slate-900 text-slate-200">
                  {idx + 1}. {ch.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mini RSVP Stage */}
        <div className="relative h-36 bg-slate-950 flex items-center justify-center px-4">
          <TargetCrosshair accentColor={settings.accentColor || '#ef4444'} />

          <div 
            className="w-full flex items-baseline font-mono tracking-tight text-3xl select-none"
            style={{ fontFamily: settings.fontFamily }}
          >
            <span className="flex-1 text-right opacity-90 truncate pr-0.5 text-slate-200">{orpData.prefix}</span>
            <span 
              className="shrink-0 font-black text-center" 
              style={{ color: settings.accentColor || '#ef4444', minWidth: '0.85ch' }}
            >
              {orpData.focalChar || ' '}
            </span>
            <span className="flex-1 text-left opacity-90 truncate pl-0.5 text-slate-200">{orpData.suffix}</span>
          </div>
        </div>

        {/* Controles do Mini-Player */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-indigo-400 font-bold">{wpm}</span>
            <span className="text-slate-500">WPM</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 10))}
              className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
              title="Voltar 10 palavras"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition"
              title="Play / Pause"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(tokens.length - 1, prev + 10))}
              className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
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
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Expandir
          </button>
        </div>
      </div>
    </div>
  );
}
