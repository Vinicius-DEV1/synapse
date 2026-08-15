import { useState, useEffect, useRef } from 'react';
import type { CardDraft } from '../types';

interface UseCardEditorFormProps {
  draft: CardDraft;
  editingCardId?: string;
  parentDeckId?: string;
  onSaveSuccess?: () => void;
  onClose: () => void;
}

export function useCardEditorForm({
  draft,
  editingCardId,
  parentDeckId,
  onSaveSuccess,
  onClose,
}: UseCardEditorFormProps) {
  const [front, setFront] = useState(draft.front);
  const [back, setBack] = useState(draft.back);
  const [extraNote, setExtraNote] = useState(draft.extra_note || '');
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(draft.media_url);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [cardType, setCardType] = useState<CardDraft['card_type']>(draft.card_type);
  const [validationMode, setValidationMode] = useState<'exact' | 'ai'>(draft.validation_mode || 'exact');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [tags, setTags] = useState<string[]>(draft.tags || []);

  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDecks();
    if (!mediaUrl && (draft.video_clip || draft.tts_text)) {
      generatePreviewAudio();
    }
  }, []);

  useEffect(() => {
    if (frontRef.current) {
      frontRef.current.style.height = 'auto';
      frontRef.current.style.height = frontRef.current.scrollHeight + 'px';
    }
    if (backRef.current) {
      backRef.current.style.height = 'auto';
      backRef.current.style.height = backRef.current.scrollHeight + 'px';
    }
  }, [front, back]);

  const generatePreviewAudio = async () => {
    setGeneratingAudio(true);
    try {
      if (window.api?.audio) {
        if (draft.video_clip) {
          const { path, startMs, endMs } = draft.video_clip;
          const audioRes = await window.api.audio.extractClip(path, startMs, endMs);
          if (audioRes.success) setMediaUrl(audioRes.filePath);
        } else if (draft.tts_text) {
          const audioRes = await window.api.audio.generateTTS(draft.tts_text, 'en-US');
          if (audioRes.success) setMediaUrl(audioRes.filePath);
        }
      }
    } catch (err) {
      console.error('Audio preview failed:', err);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const loadDecks = async () => {
    if (window.api?.anki) {
      const res = await window.api.anki.getDecks();
      if (res.success && res.decks && res.decks.length > 0) {
        setDecks(res.decks);
        if (draft.deck_id) {
          setSelectedDeck(draft.deck_id);
        } else if (parentDeckId && res.decks.find((d: any) => d.id === parentDeckId)) {
          setSelectedDeck(parentDeckId);
        } else {
          setSelectedDeck(res.decks[0].id);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!selectedDeck) return;
    setLoading(true);

    let finalMediaUrl = mediaUrl;

    try {
      if (!finalMediaUrl && window.api?.audio) {
        if (draft.video_clip) {
          const { path, startMs, endMs } = draft.video_clip;
          const audioRes = await window.api.audio.extractClip(path, startMs, endMs);
          if (audioRes.success) finalMediaUrl = audioRes.filePath;
        } else if (draft.tts_text) {
          const audioRes = await window.api.audio.generateTTS(draft.tts_text, 'en-US');
          if (audioRes.success) finalMediaUrl = audioRes.filePath;
        }
      }

      if (window.api?.anki) {
        if (editingCardId) {
          const res = await window.api.anki.updateCard(editingCardId, {
            front,
            back,
            extra_note: extraNote,
            media_url: finalMediaUrl,
            validation_mode: validationMode,
            card_type: cardType,
            deck_id: selectedDeck,
            tags,
          });
          if (!res.success) throw new Error(res.error);
        } else {
          const res = await window.api.anki.saveNote({
            deck_id: selectedDeck,
            front,
            back,
            extra_note: extraNote,
            source_module: draft.source_module,
            source_id: draft.source_id,
            media_url: finalMediaUrl,
            card_type: cardType,
            validation_mode: validationMode,
            tags,
          });
          if (!res.success) throw new Error(res.error);
        }

        if (onSaveSuccess) onSaveSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCardsFromAI = async (cards: any[]) => {
    if (!selectedDeck || !window.api?.anki) return;
    setLoading(true);
    let successCount = 0;
    try {
      for (const card of cards) {
        const payload = {
          deck_id: card.suggested_deck_id || selectedDeck,
          front: card.front,
          back: card.back || '',
          card_type: card.type || 'reading',
          source_module: 'manual',
          validation_mode: card.validation_mode || 'exact',
          tags: card.tags || [],
        };
        const res = await window.api.anki.saveNote(payload);
        if (res.success) successCount++;
      }
      if (successCount > 0 && onSaveSuccess) {
        onSaveSuccess();
      }
      if (!editingCardId && successCount > 0) {
        setFront('');
        setBack('');
        setExtraNote('');
        setTags([]);
        if (frontRef.current) frontRef.current.style.height = 'auto';
        if (backRef.current) backRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error adding AI cards:', error);
      alert('Erro ao salvar cartões da IA');
    } finally {
      setLoading(false);
    }
  };

  return {
    front,
    setFront,
    back,
    setBack,
    extraNote,
    setExtraNote,
    decks,
    selectedDeck,
    setSelectedDeck,
    loading,
    mediaUrl,
    generatingAudio,
    cardType,
    setCardType,
    validationMode,
    setValidationMode,
    showAIAssistant,
    setShowAIAssistant,
    tags,
    setTags,
    frontRef,
    backRef,
    handleSave,
    handleAddCardsFromAI,
  };
}
