import React from 'react';
import { X, Sliders, Eye, Zap, Type, Palette } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }) {
  if (!isOpen) return null;

  const fontOptions = [
    { id: 'Atkinson Hyperlegible, sans-serif', name: 'Atkinson Hyperlegible' },
    { id: 'Lexend, sans-serif', name: 'Lexend' },
    { id: 'OpenDyslexic, sans-serif', name: 'OpenDyslexic' },
    { id: 'Inter, system-ui, sans-serif', name: 'Inter' },
    { id: 'Georgia, serif', name: 'Georgia' },
    { id: 'ui-monospace, monospace', name: 'Mono Espaçado' }
  ];

  const themeOptions = [
    { id: 'dark', name: 'Slate Escuro', bg: 'bg-slate-900', text: 'text-slate-100', border: 'border-slate-700' },
    { id: 'oled', name: 'AMOLED Preto', bg: 'bg-black', text: 'text-neutral-100', border: 'border-neutral-800' },
    { id: 'sepia', name: 'Sépia Suave', bg: 'bg-[#fbf0d9]', text: 'text-[#433422]', border: 'border-[#dfd0b5]' },
    { id: 'light', name: 'Luz Diurna', bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-300' }
  ];

  const accentOptions = [
    { id: '#ef4444', name: 'Vermelho Foveal' },
    { id: '#f59e0b', name: 'Âmbar Dourado' },
    { id: '#10b981', name: 'Verde Esmeralda' },
    { id: '#06b6d4', name: 'Ciano Neônio' },
    { id: '#a855f7', name: 'Púrpura' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold">Configurações Científicas & Ergonomia</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Tipografia */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Type className="w-4 h-4 text-indigo-400" /> Fonte Ergonômica
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            >
              {fontOptions.map(font => (
                <option key={font.id} value={font.id}>{font.name}</option>
              ))}
            </select>
          </div>

          {/* Tamanho da Fonte */}
          <div>
            <div className="flex justify-between items-center text-sm font-semibold text-slate-300 mb-2">
              <span>Tamanho do Texto no Visor</span>
              <span className="text-indigo-400 font-mono">{settings.fontSize || 48}px</span>
            </div>
            <input
              type="range"
              min="28"
              max="76"
              step="2"
              value={settings.fontSize || 48}
              onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Tema Visual */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Palette className="w-4 h-4 text-indigo-400" /> Esquema de Cores & Contraste
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map(th => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ theme: th.id })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                    settings.theme === th.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-700 bg-slate-800/60'
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
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Eye className="w-4 h-4 text-indigo-400" /> Marcador Foveal ORP
            </label>
            <div className="flex items-center gap-3">
              {accentOptions.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => onUpdateSettings({ accentColor: acc.id })}
                  title={acc.name}
                  className={`w-8 h-8 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                    settings.accentColor === acc.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: acc.id }}
                />
              ))}
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Algoritmos Cognitivos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Zap className="w-4 h-4 text-amber-400" /> Algoritmos de Modulação Cognitiva
            </div>

            {/* Dwell Adaptativo */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div>
                <div className="text-sm font-medium text-slate-200">Dwell-Time Adaptativo</div>
                <div className="text-xs text-slate-400">Pausa maior em nomes próprios (+38%) e termos técnicos (+45%)</div>
              </div>
              <input
                type="checkbox"
                checked={settings.adaptiveDwell !== false}
                onChange={(e) => onUpdateSettings({ adaptiveDwell: e.target.checked })}
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            {/* Wrap-up Sintático */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div>
                <div className="text-sm font-medium text-slate-200">Wrap-up Sintático</div>
                <div className="text-xs text-slate-400">Pausas reflexivas em pontos finais (1.85x) e vírgulas (1.35x)</div>
              </div>
              <input
                type="checkbox"
                checked={settings.syntacticWrapup !== false}
                onChange={(e) => onUpdateSettings({ syntacticWrapup: e.target.checked })}
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
