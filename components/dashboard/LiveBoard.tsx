'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { LayoutGroup } from 'motion/react';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';
import TickerInspector from '@/components/dashboard/TickerInspector';

export type InspectTarget = { symbol: string; name: string; layoutId: string; quote: StockQuote | null };

type LiveBoardValue = {
    // Latest live quote for a symbol, or null before the first refresh.
    live: (symbol: string) => StockQuote | null | undefined;
    open: (target: InspectTarget) => void;
    openLayoutId: string | null;
};

const LiveBoardContext = createContext<LiveBoardValue | null>(null);

export const useLiveBoard = () => {
    const ctx = useContext(LiveBoardContext);
    if (!ctx) throw new Error('useLiveBoard must be used inside <LiveBoard>');
    return ctx;
};

// Dashboard-wide live data + the shared-layout group that lets any ticker
// tile morph into the inspector. One batch poll covers every symbol shown.
const LiveBoard = ({ symbols, children }: { symbols: string[]; children: React.ReactNode }) => {
    const quotes = useLiveQuotes(symbols);
    const [target, setTarget] = useState<InspectTarget | null>(null);
    // The element that opened the inspector, captured at click time so focus
    // can return to it after the close animation.
    const opener = useRef<HTMLElement | null>(null);
    const open = useCallback((t: InspectTarget) => {
        opener.current = document.activeElement as HTMLElement | null;
        setTarget(t);
    }, []);

    const live = useCallback((symbol: string) => quotes?.[symbol.toUpperCase()], [quotes]);
    const value = useMemo(() => ({ live, open, openLayoutId: target?.layoutId ?? null }), [live, open, target]);

    return (
        <LiveBoardContext.Provider value={value}>
            <LayoutGroup>
                {children}
                <TickerInspector
                    target={target}
                    live={target ? live(target.symbol) : undefined}
                    onClose={() => setTarget(null)}
                    onClosed={() => opener.current?.focus({ preventScroll: true })}
                />
            </LayoutGroup>
        </LiveBoardContext.Provider>
    );
};

export default LiveBoard;
