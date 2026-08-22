import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { StoreContext, getStoreState } from '../../../../store/useStore';
import { findAllQuizBatteries } from '../utils/quizExtractor';
import type { ReferencedBattery } from '../types';

export function useQuizBatteryMentions(
  chatInput: string,
  setChatInput: (val: string) => void,
  currentBatteryTitle?: string
) {
  const ctx = useContext(StoreContext);
  const state = ctx?.state || getStoreState();
  const [availableBatteries, setAvailableBatteries] = useState<ReferencedBattery[]>([]);
  const [attachedBatteries, setAttachedBatteries] = useState<ReferencedBattery[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [isLoadingBatteries, setIsLoadingBatteries] = useState(false);

  // Loads all existing exercise quiz batteries in the app
  useEffect(() => {
    let isMounted = true;
    const loadBatteries = async () => {
      if (!state.pages || state.pages.length === 0) return;
      setIsLoadingBatteries(true);
      try {
        const batteries = await findAllQuizBatteries(state.pages, currentBatteryTitle);
        if (isMounted) {
          setAvailableBatteries(batteries);
        }
      } catch (err) {
        console.warn('Erro ao carregar baterias para menções:', err);
      } finally {
        if (isMounted) setIsLoadingBatteries(false);
      }
    };

    loadBatteries();
    return () => {
      isMounted = false;
    };
  }, [state.pages, currentBatteryTitle]);

  // Filters available batteries based on query text typed after @
  const filteredBatteries = useMemo(() => {
    const q = mentionQuery.toLowerCase().trim();
    return availableBatteries.filter((b) => {
      // Evita sugerir a bateria que já está anexada
      if (attachedBatteries.some((att) => att.id === b.id)) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.pageTitle.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [availableBatteries, attachedBatteries, mentionQuery]);

  // Attaches an exercise battery as reference
  const handleAttachBattery = useCallback((battery: ReferencedBattery) => {
    if (!attachedBatteries.some((b) => b.id === battery.id)) {
      setAttachedBatteries((prev) => [...prev, battery]);
    }

    // Remove o termo @... do texto do input
    const cleaned = chatInput.replace(/(?:^|\s)@([^\s@]*)$/, ' ').trimStart();
    setChatInput(cleaned);
    setShowMentionMenu(false);
    setMentionQuery('');
  }, [attachedBatteries, chatInput, setChatInput]);

  // Remove uma bateria anexada
  const handleRemoveBattery = useCallback((batteryId: string) => {
    setAttachedBatteries((prev) => prev.filter((b) => b.id !== batteryId));
  }, []);

  // Monitora a digitação no input para detectar o caractere @
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setChatInput(val);

    const match = val.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setShowMentionMenu(true);
      setMentionQuery(match[1]);
      setMentionSelectedIndex(0);
    } else {
      setShowMentionMenu(false);
    }
  }, [setChatInput]);

  // Intercepta teclas de navegação no menu de menções
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): boolean => {
    if (!showMentionMenu || filteredBatteries.length === 0) {
      if (e.key === 'Escape' && showMentionMenu) {
        e.preventDefault();
        setShowMentionMenu(false);
        return true;
      }
      return false;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionSelectedIndex((prev) => (prev + 1) % filteredBatteries.length);
      return true;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionSelectedIndex((prev) => (prev - 1 + filteredBatteries.length) % filteredBatteries.length);
      return true;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = filteredBatteries[mentionSelectedIndex] || filteredBatteries[0];
      if (selected) {
        handleAttachBattery(selected);
      }
      return true;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionMenu(false);
      return true;
    }

    return false;
  }, [showMentionMenu, filteredBatteries, mentionSelectedIndex, handleAttachBattery]);

  const clearAttachedBatteries = useCallback(() => {
    setAttachedBatteries([]);
  }, []);

  return {
    availableBatteries,
    attachedBatteries,
    showMentionMenu,
    setShowMentionMenu,
    mentionQuery,
    mentionSelectedIndex,
    filteredBatteries,
    isLoadingBatteries,
    handleAttachBattery,
    handleRemoveBattery,
    handleInputChange,
    handleKeyDown,
    clearAttachedBatteries,
  };
}
