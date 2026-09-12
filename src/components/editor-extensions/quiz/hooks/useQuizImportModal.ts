import { useState, useRef, useCallback, useEffect } from 'react';
import { triggerToast } from '../../../ui/ToastContext';
import {
  promptGeminiToParseDocumentToQuizJSON,
  promptGeminiToRefineImportedQuestions,
  getCadernoQuizJsonSchemaPrompt,
} from '../../../../services/gemini';
import { extractTextFromPdf } from '../../../../utils/pdf-text-extractor';
import { mapParsedToQuestionItems, parseJsonToQuestions } from '../utils/quizImportParser';
import type { QuestionItem } from '../types';

export interface UseQuizImportModalProps {
  onClose: () => void;
  onImport: (questions: QuestionItem[], mode: 'replace' | 'append') => void;
  currentBatteryQuestions?: QuestionItem[];
}

export function useQuizImportModal({
  onClose,
  onImport,
  currentBatteryQuestions = [],
}: UseQuizImportModalProps) {
  const [importJsonText, setImportJsonText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<QuestionItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refinement state
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  }, [onClose]);

  const handleDeleteSingleQuestion = useCallback((indexToDelete: number) => {
    setImportPreview((prev) => {
      if (!prev) return null;
      return prev.filter((_, idx) => idx !== indexToDelete);
    });
    triggerToast('Questão removida do preview.', 'info', 2000);
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportError(null);
  };

  const handleProcess = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportError(null);
    setImportPreview(null);

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'json') {
          const text = await selectedFile.text();
          if (!mountedRef.current) return;
          const parsed = parseJsonToQuestions(text);
          if (parsed.length === 0) throw new Error('Nenhuma questão encontrada no arquivo JSON.');
          setImportPreview(parsed);
          return;
        }

        if (fileExt === 'md' || fileExt === 'markdown' || fileExt === 'txt') {
          setIsProcessingAi(true);
          setAiStatusMessage('Lendo Markdown e adaptando questões com IA...');
          const text = await selectedFile.text();
          if (!mountedRef.current) return;
          const aiQuestions = await promptGeminiToParseDocumentToQuizJSON(
            text,
            'markdown',
            (msg) => {
              if (mountedRef.current) setAiStatusMessage(msg);
            }
          );
          if (!mountedRef.current) return;
          const mapped = mapParsedToQuestionItems(aiQuestions as unknown as Array<Record<string, unknown>>);
          setImportPreview(mapped);
          return;
        }

        if (fileExt === 'pdf') {
          setIsProcessingAi(true);
          setAiStatusMessage('Extraindo texto das páginas do PDF...');
          const arrayBuffer = await selectedFile.arrayBuffer();
          if (!mountedRef.current) return;
          const extractedText = await extractTextFromPdf(arrayBuffer);
          if (!mountedRef.current) return;

          if (!extractedText.trim()) {
            throw new Error('Não foi possível extrair texto legível do arquivo PDF.');
          }

          setAiStatusMessage('Analisando exercícios e estruturando questões com IA...');
          const aiQuestions = await promptGeminiToParseDocumentToQuizJSON(
            extractedText,
            'pdf',
            (msg) => {
              if (mountedRef.current) setAiStatusMessage(msg);
            }
          );
          if (!mountedRef.current) return;
          const mapped = mapParsedToQuestionItems(aiQuestions as unknown as Array<Record<string, unknown>>);
          setImportPreview(mapped);
          return;
        }

        throw new Error('Formato de arquivo não suportado. Utilize arquivos .json, .md ou .pdf.');
      }

      // No file selected, parse raw textarea input
      if (!importJsonText.trim()) {
        throw new Error('Cole o JSON ou selecione um arquivo (.json, .md, .pdf) para continuar.');
      }

      // Detect if pasted content is raw Markdown instead of JSON
      const trimmed = importJsonText.trim();
      const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('```json');

      if (!looksLikeJson && (trimmed.includes('#') || trimmed.includes('-') || trimmed.length > 50)) {
        setIsProcessingAi(true);
        setAiStatusMessage('Analisando texto colado com IA...');
        const aiQuestions = await promptGeminiToParseDocumentToQuizJSON(
          trimmed,
          'markdown',
          (msg) => {
            if (mountedRef.current) setAiStatusMessage(msg);
          }
        );
        if (!mountedRef.current) return;
        const mapped = mapParsedToQuestionItems(aiQuestions as unknown as Array<Record<string, unknown>>);
        setImportPreview(mapped);
        return;
      }

      const parsed = parseJsonToQuestions(trimmed);
      if (!mountedRef.current) return;
      if (parsed.length === 0) throw new Error('Nenhuma questão encontrada no texto JSON.');
      setImportPreview(parsed);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Erro ao processar as questões.';
      setImportError(msg);
    } finally {
      if (mountedRef.current) {
        setIsProcessingAi(false);
        setAiStatusMessage('');
      }
    }
  };

  const handleCopySchemaPrompt = async () => {
    try {
      const prompt = getCadernoQuizJsonSchemaPrompt(
        currentBatteryQuestions.length > 0 ? currentBatteryQuestions : undefined
      );
      await navigator.clipboard.writeText(prompt);
      if (!mountedRef.current) return;
      setCopiedPrompt(true);
      triggerToast('Prompt e formato JSON copiados com sucesso!', 'success', 3500);
      setTimeout(() => {
        if (mountedRef.current) setCopiedPrompt(false);
      }, 2500);
    } catch (err) {
      console.error('Erro ao copiar prompt:', err);
      triggerToast('Erro ao copiar prompt para a área de transferência.', 'error');
    }
  };

  const handleRefineQuestions = async (customInstruction?: string) => {
    const instruction = customInstruction || refinePrompt;
    if (!instruction.trim() || !importPreview || importPreview.length === 0) return;

    setIsRefining(true);
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const refined = await promptGeminiToRefineImportedQuestions(importPreview, instruction.trim());
      if (!mountedRef.current) return;
      const mapped = mapParsedToQuestionItems(refined as unknown as Array<Record<string, unknown>>);
      setImportPreview(mapped);
      setRefinePrompt('');
      triggerToast('Questões refinadas com sucesso pela IA!', 'success', 3000);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Erro ao refinar questões.';
      triggerToast(msg, 'error', 4000);
    } finally {
      if (mountedRef.current) {
        setIsRefining(false);
      }
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importPreview || importPreview.length === 0) return;
    try {
      onImport(importPreview, importMode);
      triggerToast(
        `${importPreview.length} questão(ões) importada(s) com sucesso!`,
        'success',
        3000
      );
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar questões.';
      triggerToast(msg, 'error', 4000);
    }
  };

  return {
    importJsonText,
    setImportJsonText,
    selectedFile,
    setSelectedFile,
    importPreview,
    setImportPreview,
    importError,
    setImportError,
    importMode,
    setImportMode,
    isProcessingAi,
    aiStatusMessage,
    copiedPrompt,
    isDragOver,
    setIsDragOver,
    refinePrompt,
    setRefinePrompt,
    isRefining,
    fileInputRef,
    handleClose,
    handleDeleteSingleQuestion,
    handleFileSelect,
    handleProcess,
    handleCopySchemaPrompt,
    handleRefineQuestions,
    handleConfirm,
  };
}
