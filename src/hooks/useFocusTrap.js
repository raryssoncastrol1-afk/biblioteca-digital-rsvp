import { useEffect, useRef } from 'react';

/**
 * Trava o foco dentro de um modal aberto e o restaura ao fechar.
 * Uso: useFocusTrap(isOpen) dentro do componente do modal.
 */
export function useFocusTrap(isOpen) {
  const ref = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocused.current = document.activeElement;

    const focusables = () => {
      const el = ref.current;
      if (!el) return [];
      return Array.from(
        el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(el => el.offsetParent !== null || el === document.activeElement);
    };

    const first = focusables()[0];
    first?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  return ref;
}