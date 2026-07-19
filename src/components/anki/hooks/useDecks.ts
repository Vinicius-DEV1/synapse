import { useState, useEffect, useCallback } from 'react';

export function useDecks() {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.api?.anki) {
        const res = await window.api.anki.getDecks();
        if (res?.success && res.decks) {
          setDecks(res.decks);
        } else if (Array.isArray(res)) {
          setDecks(res);
        }
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return { decks, loading, error, refresh: fetchDecks };
}
