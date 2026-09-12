import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { windowService } from '../../services/windowService';

export default function WindowControls() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!windowService.isSupported()) return;
    setIsDesktop(true);

    windowService.isMaximized().then(setIsMaximized).catch(() => {});
    const cleanup = windowService.onResized(() => {
      windowService.isMaximized().then(setIsMaximized).catch(() => {});
    });

    return () => {
      cleanup();
    };
  }, []);

  if (!isDesktop) {
    return null;
  }

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await windowService.minimize();
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const maximized = await windowService.toggleMaximize();
    setIsMaximized(maximized);
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await windowService.close();
  };

  return (
    <div className="flex items-center h-full pl-1 pr-1.5 gap-0.5 self-center" data-tauri-drag-region={false}>
      <button
        onClick={handleMinimize}
        className="w-8 h-7 flex items-center justify-center rounded-md text-dark-subtext hover:text-white hover:bg-white/10 transition-colors active:scale-95"
        title="Minimizar"
        aria-label="Minimizar janela"
      >
        <Minus size={13} />
      </button>

      <button
        onClick={handleToggleMaximize}
        className="w-8 h-7 flex items-center justify-center rounded-md text-dark-subtext hover:text-white hover:bg-white/10 transition-colors active:scale-95"
        title={isMaximized ? 'Restaurar' : 'Maximizar'}
        aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
      >
        {isMaximized ? <Copy size={11} className="rotate-180" /> : <Square size={11} />}
      </button>

      <button
        onClick={handleClose}
        className="w-8 h-7 flex items-center justify-center rounded-md text-dark-subtext hover:text-white hover:bg-red-500/80 transition-colors active:scale-95"
        title="Fechar"
        aria-label="Fechar janela"
      >
        <X size={14} />
      </button>
    </div>
  );
}
