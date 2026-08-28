import React from 'react';
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
      zIndexClassName="z-50"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      containerClassName="w-full max-w-sm flex flex-col items-center"
    >
      <div className="bg-brand-900 border border-brand-700/50 rounded-2xl shadow-2xl p-6 w-full flex flex-col items-center text-center animate-scale-in">
        {result.type === 'success' ? (
          <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-2">{result.title}</h3>
        <p className="text-brand-300 text-sm mb-6">{result.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-brand-800 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export default UploadResultModal;
