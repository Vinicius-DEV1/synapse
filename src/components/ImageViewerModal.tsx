import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import getCroppedImg from '../utils/cropImage';
import { X, Save, ZoomIn, ZoomOut } from 'lucide-react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 animate-fade-in backdrop-blur-sm">
      <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20">
        <h2 className="text-white font-medium text-lg ml-4">
          {mode === 'view' ? 'Visualizador de Imagem' : 'Cortar Imagem'}
        </h2>
        <div className="flex items-center gap-4">
          {mode === 'view' ? (
            <button 
              onClick={() => setMode('crop')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cortar Imagem
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Save size={18} /> Salvar Corte
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden z-10">
        {mode === 'view' ? (
          activeSrc ? (
            <img 
              src={activeSrc} 
              alt="Viewer" 
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
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

      <div className="w-full max-w-md p-6 mt-4 bg-dark-card/80 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl z-20">
        <ZoomOut className="text-white/50" />
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <ZoomIn className="text-white/50" />
      </div>
    </div>
  );
}
