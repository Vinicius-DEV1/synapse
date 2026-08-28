import React, { useEffect, useCallback } from 'react';
import { Portal } from './Portal';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen?: boolean;
  /** Callback fired when the modal requests to close (via Escape or backdrop click) */
  onClose: () => void;
  /** Content rendered inside the modal dialog */
  children: React.ReactNode;
  /** Optional custom CSS classes for the backdrop overlay */
  backdropClassName?: string;
  /** Optional custom CSS classes for the dialog card wrapper */
  containerClassName?: string;
  /** Whether pressing Escape triggers onClose. Default: true */
  closeOnEsc?: boolean;
  /** Whether clicking the backdrop overlay triggers onClose. Default: true */
  closeOnOutsideClick?: boolean;
  /** Custom z-index class if overriding default z-50 */
  zIndexClassName?: string;
}

/**
 * Standard, accessible Modal dialog primitive.
 * Encapsulates Portal mounting, keyboard Escape listeners,
 * backdrop dismissal, and document body scroll locking.
 */
export function Modal({
  isOpen = true,
  onClose,
  children,
  backdropClassName = 'bg-black/60 backdrop-blur-sm',
  containerClassName = '',
  closeOnEsc = true,
  closeOnOutsideClick = true,
  zIndexClassName = 'z-50',
}: ModalProps) {
  // Handle Escape key navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  // Lock body scroll and attach keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center p-4 ${backdropClassName} animate-fade-in`}
        onClick={closeOnOutsideClick ? onClose : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={containerClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}

export default Modal;
