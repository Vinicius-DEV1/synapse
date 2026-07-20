import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  // O React Portal renderiza os children diretamente no document.body
  // Garantindo que escapemos de contextos de empilhamento locais (z-index, overflow, etc).
  return createPortal(children, document.body);
}
