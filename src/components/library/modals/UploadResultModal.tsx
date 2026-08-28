import { CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from '../../ui/Modal';

export interface UploadResult {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export interface UploadResultModalProps {
  result: UploadResult | null;
  onClose: () => void;
}

export function UploadResultModal({ result, onClose }: UploadResultModalProps) {
  if (!result) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      zIndexClassName="z-[100]"
      backdropClassName="bg-black/60 backdrop-blur-sm"
      containerClassName="w-full max-w-sm flex flex-col items-center"
    >
      <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 w-full flex flex-col items-center text-center animate-scale-in">
        {result.type === 'success' ? (
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
            <CheckCircle2 size={32} />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20">
            <XCircle size={32} />
          </div>
        )}
        <h3 className="text-lg font-semibold text-white mb-2">{result.title}</h3>
        <p className="text-dark-subtext text-sm mb-6 leading-relaxed">{result.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white rounded-xl font-medium transition-all border border-white/10"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export default UploadResultModal;

