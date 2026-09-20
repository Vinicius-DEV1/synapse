import { useState, useEffect, useCallback } from 'react';
import { getSecurityLock } from '../../services/sync';
import { getRandomIntimidatingPhrase } from './AuthSecurityPhrases';

export function useAuthLockout(isSetup: boolean) {
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [intimidatingPhrase, setIntimidatingPhrase] = useState('');

  const checkLockout = useCallback(async () => {
    if (isSetup) return;
    const localLock = await getSecurityLock();
    if (!localLock) return;

    if (localLock.failedAttempts > 0 && localLock.failedAttempts % 3 === 0) {
      const remaining = 15 - Math.floor((Date.now() - localLock.lastFailedAt) / 1000);
      if (remaining > 0) {
        setLockoutTime(remaining);
        setIntimidatingPhrase((prev) => prev || getRandomIntimidatingPhrase());
      } else {
        setLockoutTime(0);
      }
    } else {
      setLockoutTime(0);
    }
  }, [isSetup]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let localLock: { failedAttempts: number; lastFailedAt: number } | null = null;

    const initLock = async () => {
      if (isSetup) return;
      localLock = await getSecurityLock();
      updateLockout();
    };

    const updateLockout = () => {
      if (!localLock) return;
      if (localLock.failedAttempts > 0 && localLock.failedAttempts % 3 === 0) {
        const remaining = 15 - Math.floor((Date.now() - localLock.lastFailedAt) / 1000);
        if (remaining > 0) {
          setLockoutTime(remaining);
          setIntimidatingPhrase((prev) => prev || getRandomIntimidatingPhrase());
        } else {
          setLockoutTime(0);
        }
      } else {
        setLockoutTime(0);
      }
    };

    initLock();
    interval = setInterval(updateLockout, 1000);
    return () => clearInterval(interval);
  }, [isSetup]);

  const triggerImmediateLockout = useCallback((seconds = 15) => {
    setLockoutTime(seconds);
    setIntimidatingPhrase(getRandomIntimidatingPhrase());
  }, []);

  return { lockoutTime, intimidatingPhrase, checkLockout, triggerImmediateLockout };
}
