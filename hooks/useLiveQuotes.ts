'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getQuotes } from '@/lib/actions/market.actions';

const LIVE_INTERVAL_MS = 30_000;

// Polls live quotes for `symbols` every 30s while the tab is visible (and
// immediately when it becomes visible again). Returns null until the first
// refresh, so callers fall back to their server-rendered data.
export const useLiveQuotes = (symbols: string[]) => {
    const [quotes, setQuotes] = useState<Record<string, StockQuote | null> | null>(null);
    const key = [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(',');

    useEffect(() => {
        if (!key) return;
        let cancelled = false;
        const list = key.split(',');

        const refresh = () => {
            if (document.visibilityState !== 'visible') return;
            getQuotes(list)
                .then((q) => !cancelled && setQuotes(q))
                .catch((e) => console.error('Live quote refresh failed', e));
        };
        const onVisible = () => document.visibilityState === 'visible' && refresh();

        const interval = setInterval(refresh, LIVE_INTERVAL_MS);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [key]);

    return quotes;
};

// Returns 'flash-up' / 'flash-down' whenever `value` (e.g. price) or
// `secondary` (e.g. % change) moves, plus a counter that changes on every
// update so callers can restart the animation. Direction follows `value`,
// falling back to `secondary` when only that changed.
export const usePriceFlash = (value?: number, secondary?: number) => {
    const prev = useRef({ value, secondary });
    const [flash, setFlash] = useState<{ cls: '' | 'flash-up' | 'flash-down'; n: number }>({ cls: '', n: 0 });

    useEffect(() => {
        const before = prev.current;
        prev.current = { value, secondary };
        const delta =
            before.value !== undefined && value !== undefined && before.value !== value
                ? value - before.value
                : before.secondary !== undefined && secondary !== undefined && before.secondary !== secondary
                  ? secondary - before.secondary
                  : 0;
        if (delta === 0) return;
        const cls = delta > 0 ? 'flash-up' : 'flash-down';
        // Deferred so the state update happens outside the effect body.
        const id = requestAnimationFrame(() => setFlash((f) => ({ cls, n: f.n + 1 })));
        return () => cancelAnimationFrame(id);
    }, [value, secondary]);

    return flash;
};

// A shared minute clock (undefined during SSR) for time-based UI.
const subscribeClock = (cb: () => void) => {
    const id = setInterval(cb, 15_000);
    return () => clearInterval(id);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
export const useMinuteClock = () => useSyncExternalStore(subscribeClock, getMinute, () => undefined);
