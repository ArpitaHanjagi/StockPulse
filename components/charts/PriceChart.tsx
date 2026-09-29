'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getPriceHistory } from '@/lib/actions/market.actions';
import { sma } from '@/lib/market/technicals';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { niceTicks } from '@/lib/market/chart-utils';
import { cn } from '@/lib/utils';

type Mode = 'candles' | 'line' | 'baseline';

const RANGES: ChartRangeKey[] = ['1D', '5D', '1M', '6M', '1Y', '5Y'];
const MODES: { value: Mode; label: string }[] = [
    { value: 'candles', label: 'Candles' },
    { value: 'line', label: 'Line' },
    { value: 'baseline', label: 'Baseline' },
];

const AXIS_W = 72;
const PAD_L = 8;
const PAD_T = 12;
const X_AXIS_H = 22;
const VOLUME_H = 80;
const PANE_GAP = 10;

type Props = {
    symbol: string;
    initial?: PriceHistory | null;
    defaultRange?: ChartRangeKey;
    defaultMode?: Mode;
    // 'full': candles/line/baseline, SMA overlays, volume. 'compact': line only.
    variant?: 'full' | 'compact';
    // Index levels are points, not money.
    valueFormat?: 'currency' | 'number';
    height?: number;
};

const PriceChart = ({
    symbol,
    initial = null,
    defaultRange = '1Y',
    defaultMode = 'candles',
    variant = 'full',
    valueFormat = 'currency',
    height,
}: Props) => {
    const full = variant === 'full';
    const [range, setRange] = useState<ChartRangeKey>(initial?.range ?? defaultRange);
    const [mode, setMode] = useState<Mode>(full ? defaultMode : 'line');
    const [showSma, setShowSma] = useState({ 20: full, 50: full });
    const [result, setResult] = useState<{ key: string; history: PriceHistory | null } | null>(
        initial ? { key: `${symbol}:${initial.range}`, history: initial } : null
    );
    const [hover, setHover] = useState<number | null>(null);
    const [width, setWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const key = `${symbol}:${range}`;
    const loading = result?.key !== key;
    const history = result?.history ?? null;

    useEffect(() => {
        if (result?.key === key) return;
        let cancelled = false;
        getPriceHistory(symbol, range)
            .then((h) => !cancelled && setResult({ key, history: h }))
            .catch(() => !cancelled && setResult({ key, history: null }));
        return () => {
            cancelled = true;
        };
    }, [key, symbol, range, result?.key]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const candles = useMemo(() => history?.candles ?? [], [history]);
    const closes = useMemo(() => candles.map((c) => c.c), [candles]);
    const sma20 = useMemo(() => sma(closes, 20), [closes]);
    const sma50 = useMemo(() => sma(closes, 50), [closes]);
    const hasVolume = full && candles.some((c) => c.v > 0);

    const totalH = height ?? (full ? 460 : 260);
    const volumeH = hasVolume ? VOLUME_H : 0;
    const mainH = totalH - X_AXIS_H - (hasVolume ? VOLUME_H + PANE_GAP : 0);
    const plotW = Math.max(0, width - PAD_L - AXIS_W);
    const n = candles.length;
    const step = n > 0 ? plotW / n : 0;

    // Baseline: previous close for intraday, first close otherwise.
    const baseline = range === '1D' || range === '5D' ? history?.previousClose ?? closes[0] : closes[0];

    const { yMin, yMax } = useMemo(() => {
        const values: number[] = [];
        candles.forEach((c, i) => {
            if (mode === 'candles') values.push(c.h, c.l);
            else values.push(c.c);
            if (full && showSma[20] && sma20[i] !== undefined) values.push(sma20[i]!);
            if (full && showSma[50] && sma50[i] !== undefined) values.push(sma50[i]!);
        });
        if (mode === 'baseline' && baseline !== undefined) values.push(baseline);
        if (values.length === 0) return { yMin: 0, yMax: 1 };
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        const pad = (hi - lo || hi * 0.01 || 1) * 0.06;
        return { yMin: lo - pad, yMax: hi + pad };
    }, [candles, mode, full, showSma, sma20, sma50, baseline]);

    const x = (i: number) => PAD_L + (i + 0.5) * step;
    const y = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * (mainH - PAD_T);
    const volTop = mainH + PANE_GAP;
    const maxVol = Math.max(1, ...candles.map((c) => c.v));
    const yVol = (v: number) => volTop + volumeH - (v / maxVol) * volumeH;

    const currency = history?.currency ?? 'USD';
    const fmtValue = (v?: number) => {
        if (v === undefined) return '—';
        const digits = Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 2 : 4;
        return valueFormat === 'number'
            ? v.toLocaleString('en-US', { maximumFractionDigits: 2 })
            : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: digits }).format(v);
    };
    const fmtAxis = (v: number) =>
        Math.abs(v) >= 10000
            ? v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
            : v.toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 });
    const tz = history?.timezone ?? 'UTC';
    const fmtTime = (t: number, detailed = false) => {
        const d = new Date(t * 1000);
        const opts: Intl.DateTimeFormatOptions =
            range === '1D'
                ? { hour: 'numeric', minute: '2-digit' }
                : range === '5D'
                  ? detailed
                      ? { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
                      : { weekday: 'short', day: 'numeric' }
                  : range === '5Y'
                    ? detailed
                        ? { day: 'numeric', month: 'short', year: 'numeric' }
                        : { month: 'short', year: 'numeric' }
                    : range === '1Y' && !detailed
                      ? { month: 'short', year: 'numeric' }
                      : { day: 'numeric', month: 'short', ...(detailed ? { year: 'numeric' } : {}) };
        return d.toLocaleString('en-US', { ...opts, timeZone: tz });
    };

    const linePath = (values: (number | undefined)[]) => {
        let d = '';
        values.forEach((v, i) => {
            if (v === undefined) return;
            d += `${d ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        });
        return d;
    };

    const closePath = linePath(closes);
    const yTicks = niceTicks(yMin, yMax, full ? 6 : 4);
    const xTickCount = Math.max(2, Math.min(6, Math.floor(plotW / 110)));
    const xTicks = n > 1 ? Array.from({ length: xTickCount }, (_, k) => Math.round((k * (n - 1)) / (xTickCount - 1))) : [];

    const first = candles[0];
    const latest = candles[n - 1];
    const active = hover !== null ? candles[hover] : latest;
    const activeIndex = hover ?? n - 1;
    const prevClose = activeIndex > 0 ? candles[activeIndex - 1]?.c : baseline;
    const activeChange = active && prevClose ? ((active.c - prevClose) / prevClose) * 100 : undefined;
    const rangeChange = latest && baseline ? ((latest.c - baseline) / baseline) * 100 : undefined;

    const handlePointer = (e: React.PointerEvent<SVGRectElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const i = Math.floor((e.clientX - rect.left) / step);
        setHover(Math.min(n - 1, Math.max(0, i)));
    };

    const baselineY = baseline !== undefined ? y(baseline) : 0;
    const clipId = `clip-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${variant}`;
    const tooltipLeft = hover !== null ? x(hover) : 0;
    const tooltipOnLeft = tooltipLeft > width / 2;

    const summaryLabel =
        first && latest
            ? `${symbol} price chart, ${range}: from ${fmtValue(first.c)} to ${fmtValue(latest.c)}${
                  rangeChange !== undefined ? ` (${rangeChange >= 0 ? '+' : ''}${rangeChange.toFixed(2)}%)` : ''
              }`
            : `${symbol} price chart`;

    return (
        <div className="flex w-full flex-col gap-3">
            {/* Controls: one row above the chart */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-md bg-gray-800 p-1" role="group" aria-label="Time range">
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            onClick={() => {
                                setHover(null);
                                setRange(r);
                            }}
                            aria-pressed={range === r}
                            className={cn(
                                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                                range === r ? 'bg-gray-600 text-gray-100' : 'text-gray-400 hover:text-gray-100'
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {full && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md bg-gray-800 p-1" role="group" aria-label="Chart type">
                            {MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => setMode(m.value)}
                                    aria-pressed={mode === m.value}
                                    className={cn(
                                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                                        mode === m.value ? 'bg-gray-600 text-gray-100' : 'text-gray-400 hover:text-gray-100'
                                    )}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        {([20, 50] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setShowSma((s) => ({ ...s, [p]: !s[p] }))}
                                aria-pressed={showSma[p]}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                    showSma[p] ? 'border-gray-600 text-gray-100' : 'border-gray-700 text-gray-500'
                                )}
                            >
                                <span
                                    className="inline-block h-0.5 w-3 rounded"
                                    style={{ background: p === 20 ? CHART_COLORS.sma20 : CHART_COLORS.sma50, opacity: showSma[p] ? 1 : 0.4 }}
                                />
                                SMA {p}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Readout: latest values, or the hovered bar's */}
            <div className="flex min-h-5 flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-gray-400 tabular-nums">
                {active ? (
                    <>
                        <span className="text-gray-300">{fmtTime(active.t, true)}</span>
                        {mode === 'candles' && full ? (
                            <>
                                <span>O <span className="text-gray-100">{fmtValue(active.o)}</span></span>
                                <span>H <span className="text-gray-100">{fmtValue(active.h)}</span></span>
                                <span>L <span className="text-gray-100">{fmtValue(active.l)}</span></span>
                                <span>C <span className="text-gray-100">{fmtValue(active.c)}</span></span>
                            </>
                        ) : (
                            <span>Close <span className="text-gray-100">{fmtValue(active.c)}</span></span>
                        )}
                        {activeChange !== undefined && (
                            <span className="text-gray-100">
                                {activeChange >= 0 ? '▲ +' : '▼ '}
                                {activeChange.toFixed(2)}%
                            </span>
                        )}
                        {full && showSma[20] && sma20[activeIndex] !== undefined && (
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-0.5 w-3 rounded" style={{ background: CHART_COLORS.sma20 }} />
                                SMA 20 <span className="text-gray-100">{fmtValue(sma20[activeIndex])}</span>
                            </span>
                        )}
                        {full && showSma[50] && sma50[activeIndex] !== undefined && (
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-0.5 w-3 rounded" style={{ background: CHART_COLORS.sma50 }} />
                                SMA 50 <span className="text-gray-100">{fmtValue(sma50[activeIndex])}</span>
                            </span>
                        )}
                        {hasVolume && (
                            <span>Vol <span className="text-gray-100">{active.v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}</span></span>
                        )}
                    </>
                ) : (
                    <span>&nbsp;</span>
                )}
            </div>

            <div ref={containerRef} className="relative w-full" style={{ height: totalH }}>
                {!loading && n === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                        No price history available for this range.
                    </div>
                )}
                {loading && (
                    <div className="absolute right-2 top-2 z-10 rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">Loading…</div>
                )}

                {width > 0 && n > 0 && (
                    <svg
                        width={width}
                        height={totalH}
                        role="img"
                        aria-label={summaryLabel}
                        className={cn('block select-none', loading && 'opacity-50')}
                    >
                        <defs>
                            <clipPath id={`${clipId}-above`}>
                                <rect x={0} y={0} width={width} height={Math.max(0, baselineY)} />
                            </clipPath>
                            <clipPath id={`${clipId}-below`}>
                                <rect x={0} y={baselineY} width={width} height={Math.max(0, mainH - baselineY)} />
                            </clipPath>
                        </defs>

                        {/* Recessive grid + right-hand price axis */}
                        {yTicks.map((t) => (
                            <g key={t}>
                                <line x1={PAD_L} x2={PAD_L + plotW} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} />
                                <text x={PAD_L + plotW + 8} y={y(t)} dy="0.35em" fontSize={11} fill={CHART_COLORS.axis}>
                                    {fmtAxis(t)}
                                </text>
                            </g>
                        ))}
                        {xTicks.map((i, k) => (
                            <text
                                key={`${i}-${k}`}
                                x={x(i)}
                                y={totalH - 6}
                                fontSize={11}
                                fill={CHART_COLORS.axis}
                                textAnchor={k === 0 ? 'start' : k === xTicks.length - 1 ? 'end' : 'middle'}
                            >
                                {fmtTime(candles[i].t)}
                            </text>
                        ))}

                        {mode === 'candles' &&
                            candles.map((c, i) => {
                                const up = c.c >= c.o;
                                const color = up ? CHART_COLORS.up : CHART_COLORS.down;
                                const bodyW = Math.max(1, Math.min(14, step * 0.65));
                                const top = y(Math.max(c.o, c.c));
                                const bodyH = Math.max(1, y(Math.min(c.o, c.c)) - top);
                                return (
                                    <g key={c.t}>
                                        <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
                                        <rect
                                            x={x(i) - bodyW / 2}
                                            y={top}
                                            width={bodyW}
                                            height={bodyH}
                                            fill={up ? 'var(--color-gray-800)' : color}
                                            stroke={color}
                                            strokeWidth={up && bodyW > 2 ? 1 : 0}
                                        />
                                    </g>
                                );
                            })}

                        {mode === 'line' && (
                            <>
                                <path
                                    d={`${closePath}L${x(n - 1)},${mainH}L${x(0)},${mainH}Z`}
                                    fill={CHART_COLORS.up}
                                    opacity={0.12}
                                />
                                <path d={closePath} fill="none" stroke={CHART_COLORS.up} strokeWidth={2} strokeLinejoin="round" />
                            </>
                        )}

                        {mode === 'baseline' && baseline !== undefined && (
                            <>
                                {(['above', 'below'] as const).map((side) => {
                                    const color = side === 'above' ? CHART_COLORS.up : CHART_COLORS.down;
                                    return (
                                        <g key={side} clipPath={`url(#${clipId}-${side})`}>
                                            <path
                                                d={`${closePath}L${x(n - 1)},${baselineY}L${x(0)},${baselineY}Z`}
                                                fill={color}
                                                opacity={0.18}
                                            />
                                            <path d={closePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                                        </g>
                                    );
                                })}
                                <line
                                    x1={PAD_L}
                                    x2={PAD_L + plotW}
                                    y1={baselineY}
                                    y2={baselineY}
                                    stroke={CHART_COLORS.axis}
                                    strokeDasharray="4 4"
                                />
                                <text x={PAD_L + 4} y={baselineY - 6} fontSize={11} fill={CHART_COLORS.axis}>
                                    {range === '1D' || range === '5D' ? 'Prev close' : 'Start'} {fmtValue(baseline)}
                                </text>
                            </>
                        )}

                        {full && showSma[20] && (
                            <path d={linePath(sma20)} fill="none" stroke={CHART_COLORS.sma20} strokeWidth={1.5} />
                        )}
                        {full && showSma[50] && (
                            <path d={linePath(sma50)} fill="none" stroke={CHART_COLORS.sma50} strokeWidth={1.5} />
                        )}

                        {hasVolume && (
                            <g>
                                <text x={PAD_L + plotW + 8} y={volTop + 10} fontSize={11} fill={CHART_COLORS.axis}>
                                    Volume
                                </text>
                                {candles.map((c, i) => {
                                    const barW = step > 4 ? step - 2 : Math.max(0.5, step * 0.8);
                                    const top = yVol(c.v);
                                    return (
                                        <rect
                                            key={c.t}
                                            x={x(i) - barW / 2}
                                            y={top}
                                            width={barW}
                                            height={Math.max(0, volTop + volumeH - top)}
                                            fill={c.c >= c.o ? CHART_COLORS.up : CHART_COLORS.down}
                                            opacity={0.45}
                                        />
                                    );
                                })}
                            </g>
                        )}

                        {/* Crosshair */}
                        {hover !== null && active && (
                            <g pointerEvents="none">
                                <line
                                    x1={x(hover)}
                                    x2={x(hover)}
                                    y1={PAD_T}
                                    y2={hasVolume ? volTop + volumeH : mainH}
                                    stroke={CHART_COLORS.crosshair}
                                    strokeDasharray="3 3"
                                />
                                <line
                                    x1={PAD_L}
                                    x2={PAD_L + plotW}
                                    y1={y(active.c)}
                                    y2={y(active.c)}
                                    stroke={CHART_COLORS.crosshair}
                                    strokeDasharray="3 3"
                                />
                                <circle cx={x(hover)} cy={y(active.c)} r={4} fill={CHART_COLORS.up} stroke="var(--color-gray-800)" strokeWidth={2} />
                            </g>
                        )}

                        {/* Hit area larger than the marks */}
                        <rect
                            x={PAD_L}
                            y={0}
                            width={plotW}
                            height={hasVolume ? volTop + volumeH : mainH}
                            fill="transparent"
                            onPointerMove={handlePointer}
                            onPointerDown={handlePointer}
                            onPointerLeave={() => setHover(null)}
                            style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
                        />
                    </svg>
                )}

                {hover !== null && active && width > 0 && (
                    <div
                        className="pointer-events-none absolute top-2 z-10 rounded-md border border-gray-700 bg-gray-800/95 px-3 py-2 text-xs shadow-lg tabular-nums"
                        style={tooltipOnLeft ? { right: width - tooltipLeft + 12 } : { left: tooltipLeft + 12 }}
                    >
                        <div className="mb-1 text-gray-400">{fmtTime(active.t, true)}</div>
                        <div className="text-sm font-semibold text-gray-100">{fmtValue(active.c)}</div>
                        {activeChange !== undefined && (
                            <div className="text-gray-300">
                                {activeChange >= 0 ? '▲ +' : '▼ '}
                                {activeChange.toFixed(2)}% vs previous
                            </div>
                        )}
                    </div>
                )}
            </div>

            {full && n > 0 && (
                <details className="text-xs text-gray-400">
                    <summary className="cursor-pointer select-none hover:text-gray-200">View data table (latest 20 bars)</summary>
                    <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left tabular-nums">
                            <thead className="text-gray-500">
                                <tr>
                                    {['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map((h) => (
                                        <th key={h} className="px-2 py-1 font-medium">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {candles.slice(-20).reverse().map((c) => (
                                    <tr key={c.t} className="border-t border-gray-800">
                                        <td className="px-2 py-1">{fmtTime(c.t, true)}</td>
                                        <td className="px-2 py-1">{fmtValue(c.o)}</td>
                                        <td className="px-2 py-1">{fmtValue(c.h)}</td>
                                        <td className="px-2 py-1">{fmtValue(c.l)}</td>
                                        <td className="px-2 py-1 text-gray-200">{fmtValue(c.c)}</td>
                                        <td className="px-2 py-1">{c.v.toLocaleString('en-US')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </div>
    );
};

export default PriceChart;
