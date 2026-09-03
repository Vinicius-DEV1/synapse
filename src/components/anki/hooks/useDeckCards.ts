import { useState, useEffect, useCallback, useRef } from 'react';

export function useDeckCards(deckId: string) {
  const [cards, setCards] = useState<any[]>([]);
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
        if (res?.success && res.cards) {
          setCards(res.cards);
        } else if (Array.isArray(res)) {
          setCards(res);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refresh: fetchCards };
}
