import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { sanitizeExpectedAnswer } from '../../../../services/gemini';
import type { QuestionItem } from '../types';

interface QuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionItem[], mode: 'replace' | 'append') => void;
}

export default function QuizImportModal({ isOpen, onClose, onImport }: QuizImportModalProps) {
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState<QuestionItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');

  if (!isOpen) return null;

  const parseJsonToQuestions = (raw: string): QuestionItem[] => {
    const json = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

    const items: any[] = Array.isArray(json)
      ? json
      : Array.isArray(json.questions)
        ? json.questions
        : Array.isArray(json.questoes)
          ? json.questoes
          : Array.isArray(json.items)
            ? json.items
            : null;

    if (!items) {
      throw new Error(
        'Não encontrei uma lista de questões no JSON. Verifique se o campo "questions" (ou "questoes") existe e é um array.'
      );
    }

    return items.map((item, idx): QuestionItem => {
      const rawType = (item.type || item.tipo || '').toLowerCase();
      const isOpenQuestion =
        rawType.includes('open') ||
        rawType.includes('aberta') ||
        rawType.includes('discursiva') ||
        rawType.includes('dissertativa');

      let options: string[] = [];
      const rawOpts =
        item.options || item.alternativas || item.opcoes || item.alternatives || [];
      if (Array.isArray(rawOpts) && rawOpts.length >= 2) {
        options = rawOpts.map((o: any) => {
          const str = typeof o === 'string' ? o : String(o);
          return str.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
        });
      }
      if (!isOpenQuestion && options.length < 2) options = ['', '', '', ''];

      let correctIndex = 0;
      const rawCorrect =
        item.correct_option ||
        item.resposta_correta ||
        (item.correctIndex ?? item.correctAnswerIndex);
      if (typeof rawCorrect === 'number') {
        correctIndex = rawCorrect;
      } else if (typeof rawCorrect === 'string') {
        const letter = rawCorrect.trim().toUpperCase().charCodeAt(0);
        if (letter >= 65 && letter <= 90) {
          correctIndex = letter - 65;
        }
      }

      return {
        id: `q_import_${Date.now()}_${idx}`,
        type: isOpenQuestion ? 'open' : 'multiple_choice',
        question: item.question || item.enunciado || item.pergunta || item.texto || '',
        options: options.length >= 2 ? options : ['', '', '', ''],
        correctIndex,
        tags: Array.isArray(item.tags)
          ? item.tags
          : Array.isArray(item.topicos)
            ? item.topicos
            : [],
        selectedIndex: null,
        expectedAnswer: sanitizeExpectedAnswer(
          item.expected_answer || item.resposta_esperada || item.gabarito || item.answer || ''
        ),
        userTypedAnswer: '',
        aiFeedback: null,
        explanation:
          item.explanation || item.explicacao || item.justificativa || item.comentario || '',
        showExplanation: false,
        answered: false,
      };
    });
  };

  const handleParse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportError(null);
    setImportPreview(null);
    try {
      if (!importJsonText.trim()) {
        throw new Error('Cole o JSON na área de texto antes de continuar.');
      }
      const parsed = parseJsonToQuestions(importJsonText);
      if (parsed.length === 0) throw new Error('Nenhuma questão encontrada no JSON.');
      setImportPreview(parsed);
    } catch (err: any) {
      setImportError(err.message || 'Erro ao interpretar o JSON.');
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importPreview || importPreview.length === 0) return;
    onImport(importPreview, importMode);
    onClose();
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-purple-950/20">
            <div className="flex items-center gap-2.5">
              <UploadCloud size={20} className="text-purple-400" />
              <h3 className="text-base font-bold text-white">Importar Questões via JSON</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Cole abaixo o JSON gerado pelo seu modelo de IA favorito (ChatGPT, Claude, Gemini, etc.) ou exportado anteriormente.
            </p>

            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Cole seu JSON aqui..."
              className="w-full h-44 bg-black/50 border border-purple-500/20 focus:border-purple-500/60 rounded-xl p-3.5 font-mono text-xs text-purple-100 placeholder-white/20 outline-none resize-none transition-colors"
            />

            {importError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {importPreview && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    {importPreview.length} questão(ões) identificada(s) com sucesso!
                  </span>
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                      />
                      <span>Acrescentar</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      <span>Substituir</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-purple-500/20 bg-purple-950/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            {!importPreview ? (
              <button
                onClick={handleParse}
                className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-colors"
              >
                Analisar JSON
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="px-5 py-2 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-xl shadow-lg shadow-green-600/30 transition-colors"
              >
                Confirmar Importação ({importPreview.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
