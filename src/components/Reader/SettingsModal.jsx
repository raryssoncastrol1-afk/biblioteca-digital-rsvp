import React from 'react';
import { X, Sliders, Eye, Zap, Type, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }) {
  const panelRef = useFocusTrap(isOpen);
  useEscapeKey(onClose);
  if (!isOpen) return null;

  const fontOptions = [
    { id: 'Atkinson Hyperlegible, sans-serif', name: 'Atkinson Hyperlegible' },
    { id: 'Lexend, sans-serif', name: 'Lexend' },
    { id: 'OpenDyslexic, sans-serif', name: 'OpenDyslexic' },
    { id: 'Inter, sans-serif', name: 'Inter' },
    { id: 'Georgia, serif', name: 'Georgia' },
    { id: 'ui-monospace, monospace', name: 'Mono Espaçado' }
  ];

  const themeOptions = [
    { id: 'dark', name: 'Slate Escuro', bg: 'bg-ink-900', text: 'text-paper-50', border: 'border-ink-700' },
    { id: 'oled', name: 'AMOLED Preto', bg: 'bg-black', text: 'text-neutral-100', border: 'border-neutral-800' },
    { id: 'sepia', name: 'Sépia Suave', bg: 'bg-[#fbf0d9]', text: 'text-[#433422]', border: 'border-[#dfd0b5]' },
    { id: 'light', name: 'Luz Diurna', bg: 'bg-paper-50', text: 'text-ink-800', border: 'border-paper-300' }
  ];

  const accentOptions = [
    { id: '#ef4444', name: 'Vermelho Foveal' },
    { id: '#f59e0b', name: 'Âmbar Dourado' },
    { id: '#10b981', name: 'Verde Esmeralda' },
    { id: '#06b6d4', name: 'Ciano Neônio' },
    { id: '#a855f7', name: 'Púrpura' }
  ];

  return (
<div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm os-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border dark:border-ink-700 border-paper-200 dark:bg-ink-900 bg-white dark:text-paper-50 text-ink-900 os-sheet-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle do Bottom-Sheet (mobile) */}
<div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full dark:bg-ink-600 bg-paper-300" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-ink-700 border-paper-200 dark:bg-ink-900/80 bg-white/80">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-400" />
              <h2 id="settings-modal-title" className="text-lg font-bold font-display">Configurações Científicas & Ergonomia</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg dark:text-paper-400 text-ink-500 dark:hover:text-paper-50 hover:text-ink-900 dark:hover:bg-ink-800 hover:bg-paper-100 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Tema do App (Global) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold dark:text-paper-300 text-ink-500 mb-2">
              <Monitor className="w-4 h-4 text-brand-400" /> Tema do App
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'system', label: 'Sistema', icon: Monitor },
                { id: 'light', label: 'Claro', icon: Sun },
                { id: 'dark', label: 'Escuro', icon: Moon }
              ].map(opt => {
                const Icon = opt.icon;
                const active = (settings.appTheme || 'system') === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onUpdateSettings({ appTheme: opt.id });
                      const isDark = opt.id === 'dark' || (opt.id === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                      document.documentElement.classList.toggle('dark', isDark);
                      localStorage.setItem('rsvp-app-theme', opt.id);
                    }}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                      active ? 'ring-2 ring-brand-500 border-brand-500 dark:bg-ink-800 bg-paper-100' : 'dark:border-ink-700 border-paper-200 dark:bg-ink-800/60 bg-paper-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipografia */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold dark:text-paper-300 text-ink-600 mb-2">
              <Type className="w-4 h-4 text-brand-400" /> Fonte Ergonômica
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
              className="w-full dark:bg-ink-800 bg-paper-100 border dark:border-ink-700 border-paper-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
            >
              {fontOptions.map(font => (
                <option key={font.id} value={font.id}>{font.name}</option>
              ))}
            </select>
          </div>

          {/* Tamanho da Fonte */}
          <div>
            <div className="flex justify-between items-center text-sm font-semibold dark:text-paper-300 text-ink-600 mb-2">
              <span>Tamanho do Texto no Visor</span>
              <span className="text-brand-400 font-mono">{settings.fontSize || 48}px</span>
            </div>
            <input
              type="range"
              min="28"
              max="76"
              step="2"
              value={settings.fontSize || 48}
              onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-brand-600 cursor-pointer"
            />
          </div>

          {/* Tema Visual */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold dark:text-paper-300 text-ink-600 mb-2">
              <Palette className="w-4 h-4 text-brand-400" /> Esquema de Cores & Contraste
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map(th => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ theme: th.id })}
                  aria-pressed={settings.theme === th.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                    settings.theme === th.id ? 'ring-2 ring-brand-500 border-brand-500' : 'dark:border-ink-700 border-paper-200 dark:bg-ink-800/60 bg-paper-100/60'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${th.bg} border ${th.border}`} />
                  <span>{th.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cor de Fixação Foveal (ORP) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold dark:text-paper-300 text-ink-600 mb-2">
              <Eye className="w-4 h-4 text-brand-400" /> Marcador Foveal ORP
            </label>
            <div className="flex items-center gap-3">
              {accentOptions.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => onUpdateSettings({ accentColor: acc.id })}
                  title={acc.name}
                  aria-label={acc.name}
                  aria-pressed={settings.accentColor === acc.id}
                  className={`w-9 h-9 rounded-full transition transform hover:scale-110 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white ${
                    settings.accentColor === acc.id ? 'ring-2 ring-white ring-offset-2 dark:ring-offset-ink-900 ring-offset-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: acc.id }}
                />
              ))}
            </div>
          </div>

          <hr className="dark:border-ink-700 border-paper-200" />

          {/* Algoritmos Cognitivos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold dark:text-paper-300 text-ink-600">
              <Zap className="w-4 h-4 text-amber-400" /> Ritmo de Leitura Inteligente
            </div>

            {/* Dwell Adaptativo */}
            <div className="flex items-center justify-between p-3 rounded-xl dark:bg-ink-800/60 bg-paper-100/60 border dark:border-ink-700/70 border-paper-200/70">
              <div>
                <div className="text-sm font-medium dark:text-paper-200 text-ink-700">Adaptar ritmo ao texto</div>
                <div className="text-xs dark:text-paper-400 text-ink-500">Pausa maior em nomes próprios e termos longos</div>
              </div>
              <input
                type="checkbox"
                checked={settings.adaptiveDwell !== false}
                onChange={(e) => onUpdateSettings({ adaptiveDwell: e.target.checked })}
                className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
              />
            </div>

            {/* Wrap-up Sintático */}
            <div className="flex items-center justify-between p-3 rounded-xl dark:bg-ink-800/60 bg-paper-100/60 border dark:border-ink-700/70 border-paper-200/70">
              <div>
                <div className="text-sm font-medium dark:text-paper-200 text-ink-700">Pausas naturais de pontuação</div>
                <div className="text-xs dark:text-paper-400 text-ink-500">Respiração em finais de frases e vírgulas para melhor compreensão</div>
              </div>
              <input
                type="checkbox"
                checked={settings.syntacticWrapup !== false}
                onChange={(e) => onUpdateSettings({ syntacticWrapup: e.target.checked })}
                className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 dark:bg-ink-900 bg-white border-t dark:border-ink-700 border-paper-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl text-sm transition"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
