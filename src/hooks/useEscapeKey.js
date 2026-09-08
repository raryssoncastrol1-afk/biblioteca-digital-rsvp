import { useEffect } from 'react';

/**
 * Fecha o componente (modal) ao pressionar Esc.
 */
export function useEscapeKey(onClose) {
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}