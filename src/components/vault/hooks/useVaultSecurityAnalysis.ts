import { useState, useEffect, useRef } from 'react';
import type { VaultItem } from '../../../types';

export interface AnalyzedItem extends VaultItem {
  strengthScore?: number;
  breachedCount?: number;
  isReused?: boolean;
}

interface UseVaultSecurityAnalysisParams {
  items: VaultItem[];
}

export function useVaultSecurityAnalysis({ items }: UseVaultSecurityAnalysisParams) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startAnalysis = async () => {
    if (analyzing || items.length === 0) return;
    setAnalyzing(true);
    setProgress(0);
    setHasAnalyzed(false);

    // Deep clone each item to prevent mutating parent component state in-place
    const results: AnalyzedItem[] = items.map((item) => ({ ...item }));

    // Group passwords to find reused ones (excluding Google SSO items which don't have passwords)
    const passwordMap = new Map<string, string[]>();
    items.forEach((item) => {
      if (item.login_type !== 'google' && item.password && item.password.length > 0) {
        const existing = passwordMap.get(item.password) || [];
        existing.push(item.id);
        passwordMap.set(item.password, existing);
      }
    });

    const reusedIds = new Set<string>();
    passwordMap.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => reusedIds.add(id));
      }
    });

    // Check breach once per unique password
    const breachCache = new Map<string, number>();
    const totalChecks = items.length;
    let completedChecks = 0;

    for (let i = 0; i < results.length; i++) {
      if (!mountedRef.current) {
        passwordMap.clear();
        breachCache.clear();
        return;
      }

      const item = results[i];
      if (item.login_type === 'google' || !item.password) {
        completedChecks++;
        if (mountedRef.current) {
          setProgress(Math.round((completedChecks / totalChecks) * 100));
        }
        continue;
      }

      item.isReused = reusedIds.has(item.id);

      // Check strength safely
      try {
        item.strengthScore = await window.api?.vault?.checkStrength(item.password);
      } catch {
        item.strengthScore = 0;
      }

      if (!mountedRef.current) return;

      // Check breach (use cache to avoid duplicate network requests)
      if (breachCache.has(item.password)) {
        item.breachedCount = breachCache.get(item.password);
      } else {
        try {
          const breachRes = await window.api?.vault?.checkBreach(item.password);
          item.breachedCount = breachRes?.count || 0;
          breachCache.set(item.password, item.breachedCount);
          // 100ms throttle to prevent rate limiting HIBP API
          await new Promise((r) => setTimeout(r, 100));
        } catch {
          item.breachedCount = 0;
        }
      }

      if (!mountedRef.current) return;

      completedChecks++;
      setProgress(Math.round((completedChecks / totalChecks) * 100));
      setAnalyzedItems([...results]);
    }

    passwordMap.clear();
    breachCache.clear();

    if (mountedRef.current) {
      setAnalyzing(false);
      setHasAnalyzed(true);
    }
  };

  const weakItems = analyzedItems.filter(
    (i) => i.login_type !== 'google' && i.strengthScore !== undefined && i.strengthScore < 3
  );
  const reusedItems = analyzedItems.filter((i) => i.login_type !== 'google' && i.isReused);
  const breachedItems = analyzedItems.filter(
    (i) => i.login_type !== 'google' && i.breachedCount !== undefined && i.breachedCount > 0
  );
  const googleItems = analyzedItems.filter((i) => i.login_type === 'google');

  // Calculate Health Score (0-100)
  let score = 100;
  if (items.length > 0) {
    const penaltyPerWeak = 5;
    const penaltyPerReused = 10;
    const penaltyPerBreached = 20;

    score -= weakItems.length * penaltyPerWeak;
    score -= reusedItems.length * penaltyPerReused;
    score -= breachedItems.length * penaltyPerBreached;
    score = Math.max(0, score);
  } else {
    score = 0;
  }

  const getScoreColor = () => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return {
    analyzing,
    progress,
    hasAnalyzed,
    weakItems,
    reusedItems,
    breachedItems,
    googleItems,
    score,
    getScoreColor,
    startAnalysis,
  };
}
