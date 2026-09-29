'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getPriceHistory } from '@/lib/actions/market.actions';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { niceTicks } from '@/lib/market/chart-utils';
import { cn } from '@/lib/utils';
import { displaySymbol, isIndianSymbol } from '@/lib/market/symbols';

const RANGES: ChartRangeKey[] = ['1M', '6M', '1Y', '5Y'];
const PRESETS = [
    { symbol: '^NSEI', label: 'Nifty 50' },
    { symbol: '^BSESN', label: 'Sensex' },
    { symbol: '^GSPC', label: 'S&P 500' },
    { symbol: '^IXIC', label: 'Nasdaq' },
];
const MAX_SERIES = 3;
const LABEL_W = 96; // room for direct end labels
const PAD = { top: 12, bottom: 22, left: 8 };
const HEIGHT = 300;

type Series = { symbol: string; points: { t: number; pct: number }[] };

// Relative performance: each symbol's % change from the start of the range,
// on one shared time axis (so different exchange calendars line up).
const CompareChart = ({ symbol }: { symbol: string }) => {
    // Benchmark against the stock's home market by default.
    const [others, setOthers] = useState<string[]>([isIndianSymbol(symbol) ? '^NSEI' : '^GSPC']);
    const [range, setRange] = useState<ChartRangeKey>('1Y');
    const [input, setInput] = useState('');
    const [loaded, setLoaded] = useState<Record<string, PriceHistory | null>>({});
    const [hoverT, setHoverT] = useState<number | null>(null);
    const [width, setWidth] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const symbols = useMemo(() => [symbol, ...others], [symbol, others]);
    const labelFor = (s: string) => PRESETS.find((p) => p.symbol === s)?.label ?? displaySymbol(s);

    useEffect(() => {
        let cancelled = false;
        for (const s of symbols) {
            const key = `${s}:${range}`;
            if (key in loaded) continue;
            getPriceHistory(s, range)
                .then((h) => !cancelled && setLoaded((prev) => ({ ...prev, [key]: h })))
                .catch(() => !cancelled && setLoaded((prev) => ({ ...prev, [key]: null })));
        }
        return () => {
            cancelled = true;
        };
    }, [symbols, range, loaded]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const series: Series[] = symbols.flatMap((s) => {
        const h = loaded[`${s}:${range}`];
        if (!h || h.candles.length < 2) return [];
        const base = h.candles[0].c;
        return [{ symbol: s, points: h.candles.map((c) => ({ t: c.t, pct: (c.c / base - 1) * 100 })) }];
    });
    const loading = symbols.some((s) => !(`${s}:${range}` in loaded));
    const failed = symbols.filter((s) => loaded[`${s}:${range}`] === null);

    const addSymbol = (raw: string) => {
        const s = raw.trim().toUpperCase();
        if (!s || symbols.includes(s) || symbols.length >= MAX_SERIES) return;
        setOthers((o) => [...o, s]);
        setInput('');
    };
    const removeSymbol = (s: string) => {
        setOthers((o) => o.filter((x) => x !== s));
        setHoverT(null);
    };

    // Scales
    const all = series.flatMap((s) => s.points);
    const tMin = Math.min(...all.map((p) => p.t));
    const tMax = Math.max(...all.map((p) => p.t));
    const vMin = Math.min(0, ...all.map((p) => p.pct));
    const vMax = Math.max(0, ...all.map((p) => p.pct));
    const vPad = (vMax - vMin || 1) * 0.08;
    const plotW = Math.max(0, width - PAD.left - LABEL_W);
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const x = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
    const y = (v: number) => PAD.top + (1 - (v - (vMin - vPad)) / (vMax - vMin + vPad * 2)) * plotH;
    const yTicks = all.length ? niceTicks(vMin - vPad, vMax + vPad, 5) : [];
    const color = (i: number) => CHART_COLORS.compare[i];

    const valueAt = (s: Series, t: number) => {
        let best = s.points[0];
        for (const p of s.points) {
            if (p.t <= t) best = p;
            else break;
        }
        return best;
    };

    // Keep end labels from overlapping: sort by value, push apart by 14px.
    const endLabels = series
        .map((s, i) => ({ s, i, y: y(s.points[s.points.length - 1].pct), pct: s.points[s.points.length - 1].pct }))
        .sort((a, b) => a.y - b.y);
    for (let k = 1; k < endLabels.length; k++) {
        endLabels[k].y = Math.max(endLabels[k].y, endLabels[k - 1].y + 14);
    }

    const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const fmtDate = (t: number, withDay = true) =>
        new Date(t * 1000).toLocaleDateString('en-US', withDay ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'short', year: 'numeric' });

    const tooltipLeft = hoverT !== null ? x(hoverT) : 0;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                {symbols.map((s, i) => (
                    <span key={s} className="flex items-center gap-1.5 rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-200">
                        <span className="inline-block h-0.5 w-3 rounded" style={{ background: color(i) }} />
                        {labelFor(s)}
                        {i > 0 && (
                            <button onClick={() => removeSymbol(s)} aria-label={`Remove ${labelFor(s)}`} className="text-gray-500 hover:text-gray-200">
                                <X className="size-3" />
                            </button>
                        )}
                    </span>
                ))}

                {symbols.length < MAX_SERIES && (
                    <form
                        className="flex items-center gap-1"
                        onSubmit={(e) => {
                            e.preventDefault();
                            addSymbol(input);
                        }}
                    >
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Add symbol, e.g. MSFT"
                            aria-label="Symbol to compare"
                            className="h-7 w-40 rounded-md border border-gray-700 bg-gray-900 px-2 text-xs text-gray-100 placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none"
                        />
                        <button type="submit" aria-label="Add to comparison" className="flex size-7 items-center justify-center rounded-md border border-gray-700 text-gray-400 hover:text-yellow-500">
                            <Plus className="size-3.5" />
                        </button>
                    </form>
                )}

                <div className="ml-auto flex items-center gap-1 rounded-md bg-gray-900/60 p-1" role="group" aria-label="Time range">
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            onClick={() => {
                                setRange(r);
                                setHoverT(null);
                            }}
                            aria-pressed={range === r}
                            className={cn('rounded px-2.5 py-1 text-xs font-medium', range === r ? 'bg-gray-600 text-gray-100' : 'text-gray-400 hover:text-gray-100')}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {symbols.length < MAX_SERIES && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    Quick add:
                    {PRESETS.filter((p) => !symbols.includes(p.symbol)).map((p) => (
                        <button key={p.symbol} onClick={() => addSymbol(p.symbol)} className="rounded border border-dashed border-gray-700 px-2 py-0.5 hover:border-yellow-500 hover:text-yellow-500">
                            {p.label}
                        </button>
                    ))}
                </div>
            )}

            {failed.length > 0 && (
                <p className="text-xs text-red-400">
                    Couldn&apos;t load {failed.join(', ')} — check the symbol.{' '}
                    {failed.filter((s) => s !== symbol).map((s) => (
                        <button key={s} onClick={() => removeSymbol(s)} className="underline">Remove {s}</button>
                    ))}
                </p>
            )}

            <div ref={ref} className="relative" style={{ height: HEIGHT }}>
                {loading && <div className="absolute right-2 top-2 z-10 rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">Loading…</div>}
                {width > 0 && series.length > 0 && (
                    <svg
                        width={width}
                        height={HEIGHT}
                        role="img"
                        className={cn('block select-none', loading && 'opacity-60')}
                        aria-label={`Performance over ${range}: ${series.map((s) => `${labelFor(s.symbol)} ${fmtPct(s.points[s.points.length - 1].pct)}`).join(', ')}`}
                    >
                        {yTicks.map((t) => (
                            <g key={t}>
                                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} strokeDasharray={t === 0 ? '4 4' : undefined} />
                                <text x={PAD.left + 4} y={y(t) - 4} fontSize={11} fill={CHART_COLORS.axis}>{`${t > 0 ? '+' : ''}${t}%`}</text>
                            </g>
                        ))}
                        <text x={PAD.left} y={HEIGHT - 6} fontSize={11} fill={CHART_COLORS.axis}>{fmtDate(tMin, false)}</text>
                        <text x={PAD.left + plotW} y={HEIGHT - 6} fontSize={11} fill={CHART_COLORS.axis} textAnchor="end">{fmtDate(tMax, false)}</text>

                        {series.map((s, i) => (
                            <path
                                key={s.symbol}
                                d={s.points.map((p, k) => `${k ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.pct).toFixed(1)}`).join('')}
                                fill="none"
                                stroke={color(symbols.indexOf(s.symbol))}
                                strokeWidth={2}
                                strokeLinejoin="round"
                                opacity={hoverT === null || i === 0 ? 1 : 0.9}
                            />
                        ))}

                        {/* Direct labels at line ends */}
                        {endLabels.map(({ s, y: ly, pct }) => (
                            <text key={s.symbol} x={PAD.left + plotW + 8} y={ly} dy="0.35em" fontSize={11} fill="#e5e7eb">
                                <tspan fontWeight={600}>{labelFor(s.symbol)}</tspan> {fmtPct(pct)}
                            </text>
                        ))}

                        {hoverT !== null && (
                            <g pointerEvents="none">
                                <line x1={x(hoverT)} x2={x(hoverT)} y1={PAD.top} y2={PAD.top + plotH} stroke={CHART_COLORS.crosshair} strokeDasharray="3 3" />
                                {series.map((s) => {
                                    const p = valueAt(s, hoverT);
                                    return <circle key={s.symbol} cx={x(p.t)} cy={y(p.pct)} r={4} fill={color(symbols.indexOf(s.symbol))} stroke="var(--color-gray-800)" strokeWidth={2} />;
                                })}
                            </g>
                        )}

                        <rect
                            x={PAD.left}
                            y={0}
                            width={plotW}
                            height={HEIGHT - PAD.bottom}
                            fill="transparent"
                            style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
                            onPointerLeave={() => setHoverT(null)}
                            onPointerMove={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                                setHoverT(tMin + frac * (tMax - tMin));
                            }}
                        />
                    </svg>
                )}

                {hoverT !== null && series.length > 0 && (
                    <div
                        className="pointer-events-none absolute top-2 z-10 rounded-md border border-gray-700 bg-gray-800/95 px-3 py-2 text-xs shadow-lg tabular-nums"
                        style={tooltipLeft > width / 2 ? { right: width - tooltipLeft + 12 } : { left: tooltipLeft + 12 }}
                    >
                        <div className="mb-1 text-gray-400">{fmtDate(valueAt(series[0], hoverT).t)}</div>
                        {series.map((s) => (
                            <div key={s.symbol} className="flex items-center gap-1.5 text-gray-300">
                                <span className="inline-block h-0.5 w-3 rounded" style={{ background: color(symbols.indexOf(s.symbol)) }} />
                                {labelFor(s.symbol)} <span className="ml-auto pl-3 text-gray-100">{fmtPct(valueAt(s, hoverT).pct)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompareChart;
