import { useState, useEffect, useCallback } from 'react';
import type { LofiItem } from '../../types';

export function useLofiAudio() {
  const [lofis, setLofis] = useState<LofiItem[]>([]);
  const [activeLofi, setActiveLofi] = useState<LofiItem | null>(null);
  const [isPlayingLofi, setIsPlayingLofi] = useState(false);
  const [lofiVolume, setLofiVolume] = useState(() => {
    const saved = localStorage.getItem('lofi_volume');
    return saved ? parseFloat(saved) : 0.5;
  });

  useEffect(() => {
    if (window.api?.config) {
      window.api.config.get('lofi_volume').then(saved => {
        if (saved !== null && saved !== undefined) {
          setLofiVolume(parseFloat(saved));
        }
      }).catch(console.error);
    }
  }, []);

  const loadLofis = useCallback(async () => {
    if (window.api?.sync) {
      try {
        const rows = await window.api.sync.getTable('lofis');
        setLofis((rows || []).filter((r: any) => !r.deleted_at));
      } catch (err) {
        console.error('Failed to load lofis', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lofi_volume', lofiVolume.toString());
    if (window.api?.config) {
      window.api.config.set('lofi_volume', lofiVolume.toString()).catch(console.error);
    }
  }, [lofiVolume]);

  return {
    lofis,
    setLofis,
    activeLofi,
    setActiveLofi,
    isPlayingLofi,
    setIsPlayingLofi,
    lofiVolume,
    setLofiVolume,
    loadLofis
  };
}
