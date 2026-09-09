import { useRef, useCallback } from 'react';

/**
 * Hook para detectar gestos de swipe e toque duplo em dispositivos touch.
 * Útil para o leitor RSVP onde não há teclado disponível.
 * 
 * @param {Object} handlers - { onSwipeLeft, onSwipeRight, onDoubleTap }
 * @returns {Object} - { onTouchStart, onTouchEnd } para aplicar no elemento
 */
export function useSwipeGesture({ onSwipeLeft, onSwipeRight, onDoubleTap }) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detectar toque duplo (< 300ms entre toques, < 30px de movimento)
    const now = Date.now();
    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30 && deltaTime < 300) {
      if (now - lastTapRef.current < 300) {
        onDoubleTap?.();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    }

    // Detectar swipe horizontal (mínimo 50px, máximo 300ms, movimento horizontal > vertical)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime < 300) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
  }, [onSwipeLeft, onSwipeRight, onDoubleTap]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
}
