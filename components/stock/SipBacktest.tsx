'use client';

import { useEffect, useRef, useState } from 'react';
import { getSipBacktest } from '@/lib/actions/market.actions';
import { formatINRCompact } from '@/lib/currency';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { niceTicks } from '@/lib/market/chart-utils';
import { cn } from '@/lib/utils';

const YEARS = [1, 3, 5, 10];
const PRESETS = [1000, 5000, 10000, 25000];
const HEIGHT = 260;
const PAD = { top: 10, right: 76, bottom: 22, left: 8 };

type SeriesKey = 'stock' | 'benchmark' | 'fd' | 'invested';

// Whole rupees read better than paise for these totals.
const rupees = (v?: number) =>
    v === undefined || Number.isNaN(v) ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const axisRupees = (v: number) => (v === 0 ? '₹0' : formatINRCompact(v));

const pct = (v?: number) => (v === undefined ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
const monthLabel = (t: number) => new Date(t * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

const SipBacktest = ({ symbol, name }: { symbol: string; name: string }) => {
    const [amountInput, setAmountInput] = useState('5000');
    const [monthly, setMonthly] = useState(5000);
    const [years, setYears] = useState(5);
    const [result, setResult] = useState<{ key: string; data: SipResult | { error: string } } | null>(null);
    const [hover, setHover] = useState<number | null>(null);
    const [width, setWidth] = useState(0);
    const boxRef = useRef<HTMLDivElement>(null);

    const key = `${symbol}:${monthly}:${years}`;
    const loading = result?.key !== key;
    const data = result && 'points' in result.data ? result.data : null;
    const error = result && 'error' in result.data ? result.data.error : null;

    useEffect(() => {
        let cancelled = false;
        getSipBacktest(symbol, monthly, years)
            .then((d) => !cancelled && setResult({ key, data: d }))
            .catch(() => !cancelled && setResult({ key, data: { error: 'Could not run the backtest right now.' } }));
        return () => {
            cancelled = true;
        };
    }, [key, symbol, monthly, years]);

    // Debounce typing in the amount box.
    useEffect(() => {
        const n = Number(amountInput);
        if (!Number.isFinite(n) || n === monthly) return;
        const id = setTimeout(() => setMonthly(n), 450);
        return () => clearTimeout(id);
    }, [amountInput, monthly]);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const series: { key: SeriesKey; label: string; color: string; dashed?: boolean }[] = [
        { key: 'stock', label: `${name} SIP`, color: CHART_COLORS.compare[0] },
        ...(data?.summary.benchmark ? [{ key: 'benchmark' as const, label: `${data.benchmarkLabel} SIP`, color: CHART_COLORS.compare[1] }] : []),
        { key: 'fd', label: `FD at ${((data?.fdRate ?? 0.07) * 100).toFixed(0)}%`, color: CHART_COLORS.compare[2] },
        { key: 'invested', label: 'Amount invested', color: CHART_COLORS.axis, dashed: true },
    ];

    const points = data?.points ?? [];
    const n = points.length;
    const plotW = Math.max(0, width - PAD.left - PAD.right);
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const maxV = Math.max(1, ...points.flatMap((p) => [p.stock, p.benchmark ?? 0, p.fd, p.invested]));
    const ticks = niceTicks(0, maxV * 1.05, 4);
    const top = ticks.at(-1) ?? maxV;
    const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD.top + (1 - v / top) * plotH;
    const path = (k: SeriesKey) =>
        points
            .map((p, i) => [i, p[k]] as const)
            .filter(([, v]) => v !== undefined)
            .map(([i, v], j) => `${j ? 'L' : 'M'}${x(i).toFixed(1)},${y(v as number).toFixed(1)}`)
            .join('');

    const s = data?.summary;
    const gain = s ? s.stock.value - s.invested : 0;
    const vsBench = s?.benchmark ? s.stock.value - s.benchmark.value : undefined;
    const active = hover !== null ? points[hover] : null;

    return (
        <div className="flex flex-col gap-4">
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                    Monthly amount
                    <span className="flex items-center rounded-md border border-gray-700 bg-gray-900 px-2 focus-within:border-yellow-500">
                        <span className="text-gray-500">₹</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={500}
                            step={500}
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            aria-label="Monthly SIP amount in rupees"
                            className="h-8 w-28 bg-transparent px-1 text-sm text-gray-100 outline-none"
                        />
                    </span>
                </label>
                <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                setAmountInput(String(p));
                                setMonthly(p);
                            }}
                            className={cn(
                                'h-8 rounded-md border px-2.5 text-xs',
                                monthly === p ? 'border-yellow-500 text-yellow-500' : 'border-gray-700 text-gray-400 hover:text-gray-100'
                            )}
                        >
                            ₹{p.toLocaleString('en-IN')}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-1 rounded-md bg-gray-900/60 p-1" role="group" aria-label="Backtest period">
                    {YEARS.map((yv) => (
                        <button
                            key={yv}
                            onClick={() => {
                                setYears(yv);
                                setHover(null);
                            }}
                            aria-pressed={years === yv}
                            className={cn('rounded px-2.5 py-1 text-xs font-medium', years === yv ? 'bg-gray-600 text-gray-100' : 'text-gray-400 hover:text-gray-100')}
                        >
                            {yv}Y
                        </button>
                    ))}
                </div>
            </div>

            {error && !loading && <p className="text-sm text-red-400">{error}</p>}

            {s && data && (
                <>
                    <p className={cn('text-sm leading-relaxed text-gray-300', loading && 'opacity-60')} aria-live="polite">
                        <span className="font-semibold text-gray-100">{rupees(s.invested)}</span> invested as{' '}
                        {rupees(data.monthly)}/month since {monthLabel(data.startDate)} would be worth{' '}
                        <span className="font-semibold text-gray-100">{rupees(s.stock.value)}</span> today (
                        {gain >= 0 ? 'a gain' : 'a loss'} of {rupees(Math.abs(gain))}).
                        {vsBench !== undefined && (
                            <>
                                {' '}That&apos;s {rupees(Math.abs(vsBench))} {vsBench >= 0 ? 'more' : 'less'} than the same SIP in {data.benchmarkLabel}.
                            </>
                        )}
                    </p>

                    {/* Summary tiles double as the accessible data summary. */}
                    <dl className={cn('grid grid-cols-2 gap-2 text-sm lg:grid-cols-4', loading && 'opacity-60')}>
                        {[
                            { label: 'Invested', value: s.invested, xirr: undefined, color: CHART_COLORS.axis },
                            { label: `${name}`, value: s.stock.value, xirr: s.stock.xirr, color: CHART_COLORS.compare[0] },
                            ...(s.benchmark ? [{ label: data.benchmarkLabel, value: s.benchmark.value, xirr: s.benchmark.xirr, color: CHART_COLORS.compare[1] }] : []),
                            { label: `FD (${(data.fdRate * 100).toFixed(0)}%)`, value: s.fd.value, xirr: s.fd.xirr, color: CHART_COLORS.compare[2] },
                        ].map((tile) => (
                            <div key={tile.label} className="rounded-md bg-gray-900/50 px-3 py-2">
                                <dt className="flex items-center gap-1.5 truncate text-[11px] text-gray-500">
                                    <span className="inline-block h-0.5 w-3 shrink-0 rounded" style={{ background: tile.color }} />
                                    {tile.label}
                                </dt>
                                <dd className="font-semibold text-gray-100 tabular-nums">{rupees(tile.value)}</dd>
                                {tile.xirr !== undefined && <dd className="text-xs text-gray-400 tabular-nums">XIRR {pct(tile.xirr)} / yr</dd>}
                            </div>
                        ))}
                    </dl>
                </>
            )}

            {/* Chart */}
            <div ref={boxRef} className="relative" style={{ height: HEIGHT }}>
                {loading && <div className="absolute right-2 top-2 z-10 rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">Calculating…</div>}
                {width > 0 && n > 1 && (
                    <svg
                        width={width}
                        height={HEIGHT}
                        role="img"
                        className={cn('block select-none', loading && 'opacity-50')}
                        aria-label={`SIP growth over ${data?.years} years: ${series
                            .map((sr) => `${sr.label} ${rupees(points.at(-1)?.[sr.key] as number | undefined)}`)
                            .join(', ')}`}
                    >
                        {ticks.map((t) => (
                            <g key={t}>
                                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} />
                                <text x={PAD.left + plotW + 8} y={y(t)} dy="0.35em" fontSize={11} fill={CHART_COLORS.axis}>
                                    {axisRupees(t)}
                                </text>
                            </g>
                        ))}
                        <text x={PAD.left} y={HEIGHT - 6} fontSize={11} fill={CHART_COLORS.axis}>
                            {monthLabel(points[0].t)}
                        </text>
                        <text x={PAD.left + plotW} y={HEIGHT - 6} fontSize={11} fill={CHART_COLORS.axis} textAnchor="end">
                            {monthLabel(points[n - 1].t)}
                        </text>

                        {series.map((sr) => (
                            <path
                                key={sr.key}
                                d={path(sr.key)}
                                fill="none"
                                stroke={sr.color}
                                strokeWidth={sr.key === 'stock' ? 2.25 : 1.75}
                                strokeDasharray={sr.dashed ? '4 4' : undefined}
                                strokeLinejoin="round"
                            />
                        ))}

                        {hover !== null && active && (
                            <g pointerEvents="none">
                                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke={CHART_COLORS.crosshair} strokeDasharray="3 3" />
                                {series.map((sr) => {
                                    const v = active[sr.key];
                                    return v === undefined ? null : (
                                        <circle key={sr.key} cx={x(hover)} cy={y(v)} r={3.5} fill={sr.color} stroke="var(--color-gray-800)" strokeWidth={2} />
                                    );
                                })}
                            </g>
                        )}

                        <rect
                            x={PAD.left}
                            y={0}
                            width={plotW}
                            height={HEIGHT - PAD.bottom}
                            fill="transparent"
                            style={{ touchAction: 'pan-y' }}
                            onPointerLeave={() => setHover(null)}
                            onPointerMove={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
                                setHover(Math.min(n - 1, Math.max(0, i)));
                            }}
                        />
                    </svg>
                )}

                {hover !== null && active && width > 0 && (
                    <div
                        className="pointer-events-none absolute top-2 z-10 rounded-md border border-gray-700 bg-gray-800/95 px-3 py-2 text-xs shadow-lg tabular-nums"
                        style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
                    >
                        <div className="mb-1 text-gray-400">{monthLabel(active.t)}</div>
                        {series.map((sr) =>
                            active[sr.key] === undefined ? null : (
                                <div key={sr.key} className="flex items-center gap-1.5 text-gray-300">
                                    <span className="inline-block h-0.5 w-3 rounded" style={{ background: sr.color }} />
                                    {sr.label}
                                    <span className="ml-auto pl-3 text-gray-100">{rupees(active[sr.key])}</span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                {series.map((sr) => (
                    <span key={sr.key} className="flex items-center gap-1.5">
                        <span className="inline-block h-0.5 w-4 rounded" style={{ background: sr.color, opacity: sr.dashed ? 0.7 : 1 }} />
                        {sr.label}
                    </span>
                ))}
            </div>

            {data && (
                <details className="text-xs text-gray-400">
                    <summary className="cursor-pointer select-none hover:text-gray-200">View as table (every 6 months)</summary>
                    <table className="mt-2 w-full text-left tabular-nums">
                        <thead className="text-gray-500">
                            <tr>
                                <th className="py-1 font-medium">Month</th>
                                <th className="py-1 text-right font-medium">Invested</th>
                                <th className="py-1 text-right font-medium">{name}</th>
                                {data.summary.benchmark && <th className="py-1 text-right font-medium">{data.benchmarkLabel}</th>}
                                <th className="py-1 text-right font-medium">FD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {points
                                .filter((_, i) => i % 6 === 0 || i === n - 1)
                                .map((p) => (
                                    <tr key={p.t} className="border-t border-gray-700/60">
                                        <td className="py-1">{monthLabel(p.t)}</td>
                                        <td className="py-1 text-right">{rupees(p.invested)}</td>
                                        <td className="py-1 text-right text-gray-200">{rupees(p.stock)}</td>
                                        {data.summary.benchmark && <td className="py-1 text-right">{rupees(p.benchmark)}</td>}
                                        <td className="py-1 text-right">{rupees(p.fd)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </details>
            )}

            <p className="text-xs text-gray-500">
                Assumes each instalment buys at that month&apos;s opening price. Excludes dividends, taxes and brokerage; FD assumed at a flat{' '}
                {((data?.fdRate ?? 0.07) * 100).toFixed(0)}% p.a. compounded monthly.{' '}
                {data?.fxNote ? `${data.fxNote} ` : ''}
                {data?.shortHistory ? `Only ${data.months} months of history are available for this stock. ` : ''}
                Past returns don&apos;t guarantee future results.
            </p>
        </div>
    );
};

export default SipBacktest;
