import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import getCroppedImg from '../../utils/crop-image';
import { X, Save, ZoomIn, ZoomOut, Scissors } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedImageSrc: string) => void;
}

export default function ImageViewerModal({ isOpen, imageSrc, onClose, onSave }: ImageViewerModalProps) {
  const [mode, setMode] = useState<'view' | 'crop'>('view');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [activeSrc, setActiveSrc] = useState('');
  const viewContainerRef = useRef<HTMLDivElement>(null);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      if (croppedAreaPixels && activeSrc) {
        const croppedImage = await getCroppedImg(activeSrc, croppedAreaPixels, 0);
        onSave(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset mode when opening a new image
  useEffect(() => {
    if (isOpen) {
      if (imageSrc) setActiveSrc(imageSrc);
      setMode('view');
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Scroll-to-zoom in view mode
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (mode !== 'view') return;
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      return Math.min(5, Math.max(0.5, prev + delta));
    });
  }, [mode]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 animate-fade-in backdrop-blur-sm">
      <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20">
        <h2 className="text-white font-medium text-lg ml-4">
          {mode === 'view' ? 'Visualizador de Imagem' : 'Cortar Imagem'}
        </h2>
        <div className="flex items-center gap-3">
          {mode === 'view' ? (
            <button 
              onClick={() => setMode('crop')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Scissors size={16} /> Cortar
            </button>
          ) : (
            <>
              <button 
                onClick={() => setMode('view')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Save size={18} /> Salvar Corte
              </button>
            </>
          )}
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div 
        ref={viewContainerRef}
        className="relative w-full flex-1 flex items-center justify-center overflow-hidden z-10"
        onWheel={handleWheel}
      >
        {mode === 'view' ? (
          activeSrc ? (
            <img 
              src={activeSrc} 
              alt="Viewer" 
              className="max-w-full max-h-full object-contain transition-transform duration-150 select-none"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          ) : (
            <div className="text-white bg-red-500/20 p-4 rounded-lg">ERRO: A imagem selecionada não possui 'src' válido!</div>
          )
        ) : (
          <Cropper
            image={activeSrc}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            classes={{
              containerClassName: 'bg-transparent'
            }}
          />
        )}
      </div>

      <div className="absolute bottom-6 z-20 w-full max-w-sm px-4 py-2.5 bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl">
        <ZoomOut className="text-white/50 flex-shrink-0" size={16} />
        <input
          type="range"
          value={zoom}
          min={0.5}
          max={5}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-white"
        />
        <ZoomIn className="text-white/50 flex-shrink-0" size={16} />
        <span className="text-white/60 text-xs font-mono min-w-[3rem] text-right">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
    </Portal>
  );
}
