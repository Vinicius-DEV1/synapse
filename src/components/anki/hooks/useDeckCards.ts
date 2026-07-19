import { useState, useEffect, useCallback } from 'react';

export function useDeckCards(deckId: string) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCards = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    try {
      if (window.api?.anki) {
        const res = await window.api.anki.getAllCards(deckId);
        if (res?.success && res.cards) {
          setCards(res.cards);
        } else if (Array.isArray(res)) {
          setCards(res);
        }
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refresh: fetchCards };
}
