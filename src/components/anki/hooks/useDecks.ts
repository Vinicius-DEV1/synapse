import { useState, useEffect, useCallback, useRef } from 'react';

export function useDecks() {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.api?.anki) {
        const res = await window.api.anki.getDecks();
        if (!isMountedRef.current) return;
        if (res?.success && res.decks) {
          setDecks(res.decks);
        } else if (Array.isArray(res)) {
          setDecks(res);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return { decks, loading, error, refresh: fetchDecks };
}
