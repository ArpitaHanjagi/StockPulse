'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import FlashOverlay from '@/components/FlashOverlay';
import { usePriceFlash } from '@/hooks/useLiveQuotes';
import { useLiveBoard } from '@/components/dashboard/LiveBoard';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/currency';
import { CHART_COLORS, heatColor } from '@/lib/market/chart-colors';
import { SPRINGS } from '@/lib/motion';
import { displaySymbol } from '@/lib/market/symbols';

// One heatmap tile. Reads its live quote, pulses (green/red flash + a quick
// transform-only scale bump) when the price or % change moves, and morphs
// into the ticker inspector on click.
const HeatTile = ({
    symbol,
    quote,
    hovered,
    onHover,
}: {
    symbol: string;
    quote: StockQuote;
    hovered: boolean;
    onHover: (symbol: string | null) => void;
}) => {
    const { open, openLayoutId } = useLiveBoard();
    const [scope, animate] = useAnimate();
    const reduceMotion = useReducedMotion();
    const change = quote.changePercent;
    const flash = usePriceFlash(quote.price, change);
    const layoutId = `ticker-heat-${symbol}`;

    useEffect(() => {
        if (!flash.n || reduceMotion || !scope.current) return;
        animate(scope.current, { scale: [1, 1.06, 1] }, { duration: 0.45, ease: 'easeOut' });
    }, [flash.n, reduceMotion, animate, scope]);

    return (
        <motion.button
            ref={scope}
            type="button"
            layoutId={layoutId}
            transition={SPRINGS.expand}
            whileHover={reduceMotion ? undefined : { scale: 1.04, zIndex: 10 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => open({ symbol, name: quote.name, layoutId, quote })}
            onPointerEnter={() => onHover(symbol)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(symbol)}
            onBlur={() => onHover(null)}
            aria-haspopup="dialog"
            aria-expanded={openLayoutId === layoutId}
            aria-label={`${quote.name}: ${formatPercent(change)} today. Open details`}
            className="relative flex h-16 min-w-8 flex-col items-center justify-center px-0.5 text-center outline-offset-2 sm:h-20 sm:min-w-11"
            style={{ flexGrow: Math.sqrt(quote.marketCap ?? 1), flexBasis: 0, background: heatColor(change), borderRadius: 3 }}
        >
            <FlashOverlay flash={flash} />
            <span className="max-w-full truncate text-[10px] font-semibold text-white sm:text-sm">{displaySymbol(symbol)}</span>
            <span className="max-w-full truncate text-[10px] text-white/90 tabular-nums sm:text-xs">
                {change === undefined ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
            </span>

            {hovered && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-max -translate-x-1/2 rounded-md border border-gray-700 bg-gray-800/95 px-3 py-2 text-left text-xs shadow-lg tabular-nums">
                    <span className="block font-semibold text-gray-100">{quote.name}</span>
                    <span className="block text-gray-300">Price {formatINR(quote.price)}</span>
                    <span className="block text-gray-300">Today {formatPercent(change)}</span>
                    <span className="block text-gray-300">Market cap {formatINRCompact(quote.marketCap)}</span>
                    <span className="mt-1 block text-gray-500">Click to inspect</span>
                </span>
            )}
        </motion.button>
    );
};

const LEGEND = [
    { label: '≤ −2%', color: CHART_COLORS.heatDown[0] },
    { label: '−1%', color: CHART_COLORS.heatDown[1] },
    { label: '−0.1%', color: CHART_COLORS.heatDown[2] },
    { label: '0', color: CHART_COLORS.heatNeutral },
    { label: '+0.1%', color: CHART_COLORS.heatUp[2] },
    { label: '+1%', color: CHART_COLORS.heatUp[1] },
    { label: '≥ +2%', color: CHART_COLORS.heatUp[0] },
];

const MARKETS: { id: HeatmapMarket; label: string; note: string }[] = [
    { id: 'india', label: 'India · NSE', note: 'Top NSE stocks by sector' },
    { id: 'us', label: 'US', note: 'Large US stocks by sector' },
];

// Large caps grouped by sector (India by default, US one toggle away). Tile
// area follows market cap, fill follows today's % change (diverging
// blue ↔ gray ↔ red), and every tile is labelled with its symbol and signed
// % so colour is never the only cue.
const SectorHeatmap = ({ sectors }: { sectors: MarketBoard['sectors'] }) => {
    const [hover, setHover] = useState<string | null>(null);
    const [market, setMarket] = useState<HeatmapMarket>('india');
    const { live } = useLiveBoard();
    const liveSectors = sectors[market].map((s) => ({
        ...s,
        items: s.items.map((i) => ({ ...i, quote: live(i.symbol) ?? i.quote })),
    }));

    // Market breadth: how many of these stocks are up, down or flat today.
    const changes = liveSectors.flatMap((s) => s.items.map((i) => i.quote?.changePercent)).filter((c): c is number => c !== undefined);
    const up = changes.filter((c) => c >= 0.1).length;
    const down = changes.filter((c) => c <= -0.1).length;
    const flat = changes.length - up - down;
    const breadth = [
        { n: up, color: CHART_COLORS.up, label: `▲ ${up} advancing` },
        { n: flat, color: CHART_COLORS.heatNeutral, label: `${flat} flat` },
        { n: down, color: CHART_COLORS.down, label: `▼ ${down} declining` },
    ];
    const mood = up > down * 1.5 ? 'Broad rally' : down > up * 1.5 ? 'Broad sell-off' : 'Mixed session';

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 rounded-md bg-gray-900/60 p-1" role="tablist" aria-label="Heatmap market">
                    {MARKETS.map((m) => (
                        <button
                            key={m.id}
                            role="tab"
                            aria-selected={market === m.id}
                            onClick={() => {
                                setMarket(m.id);
                                setHover(null);
                            }}
                            className={`relative rounded px-3 py-1.5 text-xs font-medium ${market === m.id ? 'text-gray-100' : 'text-gray-400 hover:text-gray-100'}`}
                        >
                            {market === m.id && <motion.span layoutId="heatmap-market-tab" transition={SPRINGS.expand} className="absolute inset-0 rounded bg-gray-600" />}
                            <span className="relative">{m.label}</span>
                        </button>
                    ))}
                </div>
                <span className="text-xs text-gray-500">{MARKETS.find((m) => m.id === market)!.note}</span>
            </div>
            {changes.length > 0 && (
                <div className="rounded-md border border-gray-700 bg-gray-900/40 p-3">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <span className="font-semibold text-gray-100">Market breadth · {mood}</span>
                        <span className="flex gap-3 text-gray-400 tabular-nums">
                            {breadth.map((b) => (
                                <span key={b.label}>{b.label}</span>
                            ))}
                        </span>
                    </div>
                    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${up} advancing, ${flat} flat, ${down} declining`}>
                        {breadth.filter((b) => b.n > 0).map((b) => (
                            <div key={b.label} style={{ flexGrow: b.n, background: b.color }} />
                        ))}
                    </div>
                </div>
            )}
            <div className="grid gap-3">
                {liveSectors.map((sector) => {
                    // Largest first, one row per sector, so each tile's width is
                    // its share of the sector (sqrt-scaled so small caps stay legible).
                    const items = sector.items
                        .filter((i) => i.quote)
                        .sort((a, b) => (b.quote!.marketCap ?? 0) - (a.quote!.marketCap ?? 0));
                    return (
                        <div key={sector.name}>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{sector.name}</p>
                            <div className="flex gap-0.5">
                                {items.map(({ symbol, quote }) => (
                                    <HeatTile key={symbol} symbol={symbol} quote={quote!} hovered={hover === symbol} onHover={setHover} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span>Today&apos;s change:</span>
                {LEGEND.map((l) => (
                    <span key={l.label} className="flex items-center gap-1">
                        <span className="inline-block size-3 rounded-sm" style={{ background: l.color }} />
                        {l.label}
                    </span>
                ))}
                <span className="ml-auto">Tile size = market cap</span>
            </div>
        </div>
    );
};

export default SectorHeatmap;
