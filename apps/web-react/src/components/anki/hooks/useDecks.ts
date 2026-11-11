import { useState, useEffect, useCallback, useRef } from 'react';
import type { Deck } from '../types';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
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
        if (res && typeof res === 'object' && 'decks' in res && Array.isArray((res as { decks: Deck[] }).decks)) {
          setDecks((res as { decks: Deck[] }).decks);
        } else if (Array.isArray(res)) {
          setDecks(res as Deck[]);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return { decks, loading, error, refresh: fetchDecks };
}
