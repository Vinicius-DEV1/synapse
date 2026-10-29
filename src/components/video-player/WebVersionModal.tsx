import { useState } from 'react';
import { X, Settings2, MonitorPlay } from 'lucide-react';
import Modal from '../ui/Modal';

interface WebVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quality: string) => void;
  videoTitle: string;
}

export default function WebVersionModal({ isOpen, onClose, onConfirm, videoTitle }: WebVersionModalProps) {
  const [quality, setQuality] = useState('720p');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(quality);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndexClassName="z-[1000]"
      containerClassName="w-[400px] max-w-[90vw] bg-dark-card border border-white/[0.06] p-6 rounded-2xl shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MonitorPlay size={20} className="text-brand-400" />
          Gerar Versão Web
        </h3>
        <button
          onClick={onClose}
          className="text-dark-subtext hover:text-white rounded-full p-1 hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      <p className="text-sm text-dark-subtext mb-6">
        Isso irá recodificar o arquivo original para otimizar o carregamento no navegador e no celular. O arquivo será salvo no Google Drive substituindo a versão web atual do vídeo <strong className="text-white font-medium">{videoTitle}</strong>.
      </p>

      <div className="flex flex-col gap-1.5 mb-6">
        <label className="text-xs font-medium text-dark-subtext uppercase tracking-wider flex items-center gap-1.5">
          <Settings2 size={14} /> Qualidade Desejada
        </label>
        <select
          value={quality}
          onChange={e => setQuality(e.target.value)}
          className="w-full bg-dark-bg border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="1080p">1080p Full HD (Alta Qualidade)</option>
          <option className="bg-dark-bg text-white" value="720p">720p HD (Rápido e Leve - Recomendado)</option>
          <option className="bg-dark-bg text-white" value="480p">480p SD (Bom para Celular)</option>
          <option className="bg-dark-bg text-white" value="360p">360p (Economia Máxima de Espaço)</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 mt-auto">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-dark-subtext hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="px-5 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-400 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          Iniciar Conversão
        </button>
      </div>
    </Modal>
  );
}
