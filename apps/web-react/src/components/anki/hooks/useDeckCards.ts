import { useState, useEffect, useCallback, useRef } from 'react';
import type { Card } from '../types';

export function useDeckCards(deckId: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCards = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    try {
      if (window.api?.anki) {
        const res = await window.api.anki.getAllCards(deckId);
        if (!isMountedRef.current) return;
        if (res && typeof res === 'object' && 'cards' in res && Array.isArray((res as { cards: Card[] }).cards)) {
          setCards((res as { cards: Card[] }).cards);
        } else if (Array.isArray(res)) {
          setCards(res as Card[]);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refresh: fetchCards };
}
