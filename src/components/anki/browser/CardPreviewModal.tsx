import React, { useEffect, useState } from 'react';
import { X, Edit3, Trash2 } from 'lucide-react';
import type { Card } from '../types';
import { HtmlRenderer } from '../components/HtmlRenderer';

interface CardPreviewModalProps {
  previewCard: Card;
  filteredCards: Card[];
  setPreviewCard: (card: Card | null) => void;
  setEditingCard: (card: Card) => void;
  handleDeleteCard: (id: string) => void;
}

export function CardPreviewModal({
  previewCard, filteredCards, setPreviewCard, setEditingCard, handleDeleteCard
}: CardPreviewModalProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setShowAnswer(false);
  }, [previewCard.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const idx = filteredCards.findIndex(c => c.id === previewCard.id);
        if (idx !== -1 && idx < filteredCards.length - 1) {
          setPreviewCard(filteredCards[idx + 1]);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = filteredCards.findIndex(c => c.id === previewCard.id);
        if (idx > 0) {
          setPreviewCard(filteredCards[idx - 1]);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setShowAnswer(prev => !prev);
      } else if (e.key === 'Escape') {
        setPreviewCard(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewCard, filteredCards, setPreviewCard]);

  const currentIndex = filteredCards.findIndex(c => c.id === previewCard.id) + 1;
  const totalCards = filteredCards.length;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[200] p-4 animate-fade-in">
      <div className="absolute top-6 left-6 bg-white/10 text-white/70 px-4 py-2 rounded-full text-xs font-bold tracking-widest">
        {currentIndex} DE {totalCards}
      </div>
      <button onClick={() => setPreviewCard(null)} className="absolute top-6 right-6 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
        <X size={24} />
      </button>
      <div key={previewCard.id} className="w-full max-w-2xl bg-dark-bg border border-white/10 rounded-2xl p-10 shadow-2xl flex flex-col items-center relative group animate-scale-in">
        <div className="absolute bottom-4 right-4 flex gap-2 opacity-30 hover:opacity-100 transition-opacity">
          <button onClick={() => { setEditingCard(previewCard); setPreviewCard(null); }} className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors" title="Editar">
            <Edit3 size={16} />
          </button>
          <button onClick={() => {
             handleDeleteCard(previewCard.id);
             setPreviewCard(null);
          }} className="p-2 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors" title="Excluir">
            <Trash2 size={16} />
          </button>
        </div>
        
        <HtmlRenderer html={previewCard.front} className="text-xl text-center text-white min-h-[100px] flex items-center justify-center break-words w-full whitespace-pre-wrap block" as="div" />
        
        {showAnswer ? (
          <>
            <div className="w-full h-px bg-white/10 my-8"></div>
            <HtmlRenderer html={previewCard.back} className="text-lg text-center text-dark-subtext min-h-[100px] flex items-center justify-center break-words w-full whitespace-pre-wrap block" as="div" />
          </>
        ) : (
          <button 
            onClick={() => setShowAnswer(true)} 
            className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Mostrar Resposta
          </button>
        )}
      </div>
    </div>
  );
}
