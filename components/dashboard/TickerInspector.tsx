'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import PriceChart from '@/components/charts/PriceChart';
import PriceChange from '@/components/PriceChange';
import FlashOverlay from '@/components/FlashOverlay';
import { usePriceFlash } from '@/hooks/useLiveQuotes';
import { getMoveExplanation, getQuote } from '@/lib/actions/market.actions';
import { DRIVER_BADGE } from '@/components/stock/driverBadge';
import { formatINR, formatINRCompact, formatINRRange, formatVolume } from '@/lib/currency';
import { SPRINGS } from '@/lib/motion';
import type { InspectTarget } from '@/components/dashboard/LiveBoard';
import { displaySymbol } from '@/lib/market/symbols';

const Body = ({ target, quote: known, settled, onClose }: { target: InspectTarget; quote: StockQuote | null; settled: boolean; onClose: () => void }) => {
    const closeRef = useRef<HTMLButtonElement>(null);
    // Tiles opened before the first live refresh may not carry a full quote
    // yet, so fetch a fresh one on open; live updates take over afterwards.
    const [fetched, setFetched] = useState<StockQuote | null>(null);
    const [move, setMove] = useState<MoveReport | null>(null);
    const quote = known ?? fetched;
    const flash = usePriceFlash(quote?.price, quote?.changePercent);

    useEffect(() => closeRef.current?.focus(), []);
    useEffect(() => {
        let cancelled = false;
        getQuote(target.symbol)
            .then((q) => !cancelled && setFetched(q))
            .catch((e) => console.error('Failed to load quote', e));
        getMoveExplanation(target.symbol)
            .then((m) => !cancelled && setMove(m))
            .catch((e) => console.error('Failed to explain move', e));
        return () => {
            cancelled = true;
        };
    }, [target.symbol]);

    const stats = [
        { label: 'Day range', value: formatINRRange(quote?.dayLow, quote?.dayHigh) },
        { label: '52-week range', value: formatINRRange(quote?.yearLow, quote?.yearHigh) },
        { label: 'Market cap', value: formatINRCompact(quote?.marketCap) },
        { label: 'P/E', value: quote?.peRatio !== undefined ? quote.peRatio.toFixed(2) : '—' },
        { label: 'Volume', value: formatVolume(quote?.volume) },
        { label: 'Previous close', value: formatINR(quote?.previousClose) },
    ];

    return (
        // Content fades in once the container has started morphing, and out
        // quickly on close so the shape can shrink back into the tile.
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="flex flex-col gap-4 p-5 sm:p-6"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-lg font-bold text-yellow-500">
                        {target.symbol.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h2 id="inspector-title" className="truncate text-lg font-semibold text-gray-100">
                            {quote?.name ?? target.name}
                        </h2>
                        <p className="text-xs text-gray-500">
                            {displaySymbol(target.symbol)}
                            {quote?.exchange ? ` · ${quote.exchange}` : ''}
                        </p>
                    </div>
                </div>
                <button
                    ref={closeRef}
                    onClick={onClose}
                    aria-label="Close"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-700 hover:text-gray-100"
                >
                    <X className="size-4" />
                </button>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <span className="relative rounded px-1 text-3xl font-semibold text-gray-100 tabular-nums" aria-live="polite">
                    {formatINR(quote?.price)}
                    <FlashOverlay flash={flash} />
                </span>
                <PriceChange percent={quote?.changePercent} amount={quote?.change} className="pb-1 text-sm" />
            </div>

            {/* One-line "why is it moving?" — full breakdown on the stock page.
                Shown once the morph has settled so it can't resize the card
                mid-animation. */}
            {settled && move && (
                <div className="flex items-start gap-2 rounded-md border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm">
                    {(() => {
                        const Badge = DRIVER_BADGE[move.driver].icon;
                        return <Badge className="mt-0.5 size-4 shrink-0 text-yellow-500" aria-hidden />;
                    })()}
                    <p className="text-gray-300">
                        <span className="font-medium text-gray-100">{DRIVER_BADGE[move.driver].label}:</span> {move.headline}
                    </p>
                </div>
            )}

            {/* Fixed-height slot: the chart mounts (and fetches) only after the
                morph settles, so it never competes with the animation for the
                main thread and nothing shifts when it appears. */}
            <div className="h-[268px]">
                {settled ? (
                    <PriceChart symbol={target.symbol} variant="compact" defaultRange="1M" height={190} valueFormat={quote?.isIndex ? 'number' : 'currency'} />
                ) : (
                    <div className="h-full animate-pulse rounded-md bg-gray-700/30 motion-reduce:animate-none" aria-hidden />
                )}
            </div>

            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-md bg-gray-900/50 px-3 py-2">
                        <dt className="text-[11px] text-gray-500">{s.label}</dt>
                        <dd className="font-medium text-gray-100 tabular-nums">{s.value}</dd>
                    </div>
                ))}
            </dl>

            <Link
                href={`/stocks/${target.symbol}`}
                className="flex items-center justify-center gap-2 rounded-md bg-yellow-500 py-2.5 text-sm font-semibold text-gray-900 hover:bg-yellow-400"
            >
                Open full analysis <ArrowRight className="size-4" />
            </Link>
        </motion.div>
    );
};

// Expanded "inspection" view for a ticker. Shares its layoutId with the tile
// that opened it, so Motion morphs the tile's box into this card (FLIP:
// measured once, then animated purely with transforms) and back on close.
const TickerInspector = ({
    target,
    live,
    onClose,
    onClosed,
}: {
    target: InspectTarget | null;
    live: StockQuote | null | undefined;
    onClose: () => void;
    onClosed: () => void;
}) => {
    const reduceMotion = useReducedMotion();
    // Which target's open-morph has finished (the chart waits for this).
    const [settledFor, setSettledFor] = useState<string | null>(null);

    useEffect(() => {
        if (!target) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [target, onClose]);

    return (
        // Focus goes back to the tile only once the close animation has
        // finished and the tile is visible again.
        <AnimatePresence onExitComplete={onClosed}>
            {target && (
                <div className="fixed inset-0 z-50" key="inspector">
                    <motion.div
                        className="absolute inset-0 bg-black/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        aria-hidden
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-y-auto p-4">
                        {/* Reduced motion: no shared-layout morph, just a fade. */}
                        <motion.div
                            layoutId={reduceMotion ? undefined : target.layoutId}
                            initial={reduceMotion ? { opacity: 0 } : undefined}
                            animate={reduceMotion ? { opacity: 1 } : undefined}
                            exit={reduceMotion ? { opacity: 0 } : undefined}
                            transition={reduceMotion ? { duration: 0.15 } : SPRINGS.expand}
                            onLayoutAnimationComplete={() => setSettledFor(target.layoutId)}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="inspector-title"
                            className="pointer-events-auto relative w-full max-w-2xl overflow-hidden border border-gray-600 bg-gray-800 shadow-2xl"
                            style={{ borderRadius: 14 }}
                        >
                            <Body
                                target={target}
                                quote={live ?? target.quote}
                                settled={reduceMotion === true || settledFor === target.layoutId}
                                onClose={onClose}
                            />
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TickerInspector;
