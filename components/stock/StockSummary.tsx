'use client';

import PriceChange from '@/components/PriceChange';
import { useLiveQuotes, usePriceFlash } from '@/hooks/useLiveQuotes';
import { formatINR, formatINRCompact, formatVolume } from '@/lib/currency';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { displaySymbol } from '@/lib/market/symbols';

// Where the current price sits between a low and a high.
const RangeBar = ({ label, low, high, price }: { label: string; low?: number; high?: number; price?: number }) => {
    const ready = low !== undefined && high !== undefined && price !== undefined && high > low;
    const pct = ready ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100)) : 0;

    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 sm:col-span-2 md:col-span-1 xl:col-span-2">
            <p className="text-xs text-gray-500">{label}</p>
            {ready ? (
                <>
                    <div className="relative mt-2.5 h-1.5 rounded-full bg-gray-700" role="img" aria-label={`${label}: current price is ${pct.toFixed(0)}% of the way from low to high`}>
                        {/* Transform-only motion: scaleX for the fill, translateX for the marker. */}
                        <div
                            className="absolute inset-0 origin-left rounded-full transition-transform duration-700 motion-reduce:transition-none"
                            style={{ transform: `scaleX(${pct / 100})`, background: CHART_COLORS.up, opacity: 0.5 }}
                        />
                        <div className="absolute inset-0 transition-transform duration-700 motion-reduce:transition-none" style={{ transform: `translateX(${pct}%)` }}>
                            <div className="absolute left-0 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-800" style={{ background: CHART_COLORS.up }} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs tabular-nums">
                        <span className="text-gray-400">L {formatINR(low)}</span>
                        <span className="text-gray-400">H {formatINR(high)}</span>
                    </div>
                </>
            ) : (
                <p className="mt-1 text-sm text-gray-100">—</p>
            )}
        </div>
    );
};

const StockSummary = ({ initial, actions }: { initial: StockQuote; actions: React.ReactNode }) => {
    const live = useLiveQuotes([initial.symbol]);
    const quote = live?.[initial.symbol.toUpperCase()] ?? initial;
    const flash = usePriceFlash(quote.price);

    const stats = [
        { label: 'Previous Close', value: formatINR(quote.previousClose) },
        { label: 'Volume', value: formatVolume(quote.volume) },
        { label: 'Market Cap', value: formatINRCompact(quote.marketCap) },
        { label: 'P/E Ratio', value: quote.peRatio !== undefined ? quote.peRatio.toFixed(2) : '—' },
    ];

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xl font-bold text-yellow-500 sm:size-14 sm:text-2xl">
                        {quote.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-gray-100 sm:text-2xl">
                            {quote.name} <span className="text-gray-500">({displaySymbol(quote.symbol)})</span>
                        </h1>
                        <p className="flex items-center gap-2 text-sm text-gray-500">
                            {quote.exchange}
                            <span className="flex items-center gap-1 text-xs text-teal-400" title="Price refreshes every 30 seconds while this tab is open">
                                <span className="size-1.5 rounded-full bg-teal-400" /> Live
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                    <div className="sm:text-right">
                        <div key={flash.n} className={`inline-block px-1 text-2xl font-semibold text-gray-100 tabular-nums sm:text-3xl ${flash.cls}`} aria-live="polite">
                            {formatINR(quote.price)}
                        </div>
                        <div className="text-sm">
                            <PriceChange percent={quote.changePercent} amount={quote.change} />
                        </div>
                    </div>
                    {actions}
                </div>
            </div>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                <RangeBar label="Day Range" low={quote.dayLow} high={quote.dayHigh} price={quote.price} />
                <RangeBar label="52-Week Range" low={quote.yearLow} high={quote.yearHigh} price={quote.price} />
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="mt-1 text-sm font-medium text-gray-100 tabular-nums">{stat.value}</p>
                    </div>
                ))}
            </section>
        </>
    );
};

export default StockSummary;
