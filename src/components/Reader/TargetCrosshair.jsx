import React from 'react';

/**
 * Mira visual foveal com guias superior, inferior e alinhamento do centro de foco ORP
 */
export function TargetCrosshair({ accentColor = '#ef4444' }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center py-2 select-none">
      {/* Marcador Superior */}
      <div className="w-full flex justify-center items-center">
        <div 
          className="w-1.5 h-3.5 rounded-b-sm shadow-sm transition-colors duration-200" 
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Linha guia horizontal suave */}
      <div className="w-full flex items-center justify-between px-6 opacity-25">
        <div className="h-[1px] w-1/3 bg-current" />
        <div className="h-2 w-2 rounded-full border border-current opacity-40" />
        <div className="h-[1px] w-1/3 bg-current" />
      </div>

      {/* Marcador Inferior */}
      <div className="w-full flex justify-center items-center">
        <div 
          className="w-1.5 h-3.5 rounded-t-sm shadow-sm transition-colors duration-200" 
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </div>
  );
}
