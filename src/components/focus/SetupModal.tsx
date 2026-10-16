import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Tag, AlignLeft, X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useTranslation } from '../../i18n';

interface SetupModalProps {
  onStart: (tag: string, description: string, targetTime: number) => void;
  onCancel: () => void;
  existingTags?: string[];
  initialTag?: string;
  initialDescription?: string;
  initialTargetTime?: number;
}

const PRESET_TIMES = [15, 25, 30, 45, 60];

const SetupModal: React.FC<SetupModalProps> = ({ onStart, onCancel, existingTags = [], initialTag = '', initialDescription = '', initialTargetTime = 30 }) => {
  const { t } = useTranslation();
  const [tag, setTag] = useState(initialTag);
  const [description, setDescription] = useState(initialDescription);
  const [targetTime, setTargetTime] = useState(initialTargetTime);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim() || !description.trim() || targetTime <= 0) return;
    onStart(tag.trim(), description.trim(), targetTime);
  };

  const filteredTags = useMemo(() => {
    if (!tag) return [];
    return existingTags.filter(t => t.toLowerCase().startsWith(tag.toLowerCase()) && t.toLowerCase() !== tag.toLowerCase()).slice(0, 5);
  }, [tag, existingTags]);

  const isExisting = useMemo(() => {
    return existingTags.some(t => t.toLowerCase() === tag.trim().toLowerCase());
  }, [tag, existingTags]);

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden animate-fade-in"
        onClick={onCancel}
      >
      <div 
        className="bg-dark-card rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-y-auto max-h-[95vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-brand-400">⏰</span> {t('focus.newSession', 'Nova Sessão')}
          </h2>
          <button onClick={onCancel} className="text-dark-subtext hover:text-white transition-colors" title={t('common.cancel', 'Cancelar')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 sm:space-y-6">
          {/* Tag Input */}
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-medium text-dark-subtext mb-2">
              <Tag size={16} className="text-brand-400" /> {t('focus.sessionTag', 'Tag da Sessão')}
            </label>
            <input 
              type="text" 
              placeholder={t('focus.tagPlaceholder', 'Ex: Estudo, Trabalho, Leitura')} 
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={`w-full bg-dark-bg border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all placeholder:text-white/20 ${
                isExisting && tag.trim().length > 0
                  ? 'border-brand-500 bg-brand-500/10 focus:border-brand-400 focus:ring-brand-400 text-brand-100 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                  : 'border-white/10 focus:border-brand-500 focus:ring-brand-500'
              }`}
              autoFocus
              required
            />
            
            {/* Auto-suggestions */}
            {filteredTags.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-dark-bg border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                {filteredTags.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTag(suggestion)}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-brand-500/20 hover:text-brand-300 transition-colors border-b border-white/5 last:border-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            {isExisting && tag.trim().length > 0 && (
              <p className="text-xs text-brand-400 mt-2 font-medium animate-in fade-in">{t('focus.existingTagMatched', '✓ Tag existente reconhecida!')}</p>
            )}
          </div>

          {/* Description Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-dark-subtext mb-2">
              <AlignLeft size={16} className="text-brand-400" /> {t('focus.description', 'Descrição')}
            </label>
            <input 
              type="text" 
              placeholder={t('focus.descPlaceholder', 'Ex: Estudando Cálculo Capítulo 4')} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-white/20"
              required
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-dark-subtext mb-2">
              <Clock size={16} className="text-brand-400" /> {t('focus.targetTime', 'Tempo Alvo')} ({t('focus.minutes', 'minutos')})
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_TIMES.map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTargetTime(time)}
                  className={`flex-1 min-w-[50px] py-2 rounded-lg text-sm font-medium transition-colors ${
                    targetTime === time 
                      ? 'bg-brand-600 text-white border border-brand-500' 
                      : 'bg-dark-bg text-dark-subtext border border-white/10 hover:bg-white/5'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            <input 
              type="number" 
              min="1"
              value={targetTime}
              onChange={(e) => setTargetTime(Number(e.target.value))}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-center font-bold text-lg"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={!tag.trim() || !description.trim() || targetTime <= 0}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-brand-600/20"
          >
            {t('focus.startTimer', 'INICIAR TEMPORIZADOR')}
          </button>
        </form>
      </div>
    </div>
    </Portal>
  );
};

export default SetupModal;

