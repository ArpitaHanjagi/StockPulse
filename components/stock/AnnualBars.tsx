'use client';

import { useState } from 'react';
import { formatINRCompact } from '@/lib/currency';
import { CHART_COLORS } from '@/lib/market/chart-colors';

type Year = { year: string; revenue?: number; netIncome?: number };

const SERIES = [
    { key: 'revenue', label: 'Revenue', color: CHART_COLORS.sma20 },
    { key: 'netIncome', label: 'Net income', color: CHART_COLORS.sma50 },
] as const;

const H = 180;
const PAD_T = 8;
const AXIS_H = 20;

// Grouped bars: annual revenue vs. net income, in INR. One axis, a zero
// baseline (net income can be negative), legend + hover tooltip + table.
const AnnualBars = ({ years }: { years: Year[] }) => {
    const [hover, setHover] = useState<number | null>(null);
    const values = years.flatMap((y) => [y.revenue ?? 0, y.netIncome ?? 0]);
    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    const span = max - min || 1;
    const plotH = H - PAD_T - AXIS_H;
    const y = (v: number) => PAD_T + ((max - v) / span) * plotH;

    if (years.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 text-xs text-gray-400">
                {SERIES.map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5">
                        <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>

            <div className="relative">
                <svg viewBox={`0 0 ${years.length * 100} ${H}`} className="block h-44 w-full" preserveAspectRatio="none" role="img"
                    aria-label={`Annual revenue and net income: ${years.map((yr) => `${yr.year} revenue ${formatINRCompact(yr.revenue)}, net income ${formatINRCompact(yr.netIncome)}`).join('; ')}`}>
                    <line x1={0} x2={years.length * 100} y1={y(0)} y2={y(0)} stroke={CHART_COLORS.grid} vectorEffect="non-scaling-stroke" />
                    {years.map((yr, i) => (
                        <g key={yr.year} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                            {/* Hit target covers the whole year column */}
                            <rect x={i * 100} y={0} width={100} height={H} fill={hover === i ? '#ffffff08' : 'transparent'} />
                            {SERIES.map((s, k) => {
                                const v = yr[s.key] ?? 0;
                                const top = Math.min(y(v), y(0));
                                return (
                                    <rect
                                        key={s.key}
                                        x={i * 100 + 22 + k * 30}
                                        y={top}
                                        width={26}
                                        height={Math.max(1, Math.abs(y(v) - y(0)))}
                                        rx={3}
                                        fill={s.color}
                                    />
                                );
                            })}
                        </g>
                    ))}
                </svg>
                <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
                    {years.map((yr) => (
                        <span key={yr.year}>{yr.year}</span>
                    ))}
                </div>

                {hover !== null && (
                    <div
                        className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-gray-700 bg-gray-800/95 px-3 py-2 text-xs shadow-lg tabular-nums"
                        style={{ left: `${((hover + 0.5) / years.length) * 100}%` }}
                    >
                        <div className="mb-1 font-semibold text-gray-100">FY {years[hover].year}</div>
                        {SERIES.map((s) => (
                            <div key={s.key} className="flex items-center gap-1.5 text-gray-300">
                                <span className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
                                {s.label}: <span className="text-gray-100">{formatINRCompact(years[hover][s.key])}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <details className="text-xs text-gray-400">
                <summary className="cursor-pointer select-none hover:text-gray-200">View as table</summary>
                <table className="mt-2 w-full text-left tabular-nums">
                    <thead className="text-gray-500">
                        <tr>
                            <th className="py-1 font-medium">Year</th>
                            <th className="py-1 text-right font-medium">Revenue</th>
                            <th className="py-1 text-right font-medium">Net income</th>
                        </tr>
                    </thead>
                    <tbody>
                        {years.map((yr) => (
                            <tr key={yr.year} className="border-t border-gray-700/60">
                                <td className="py-1">{yr.year}</td>
                                <td className="py-1 text-right">{formatINRCompact(yr.revenue)}</td>
                                <td className="py-1 text-right">{formatINRCompact(yr.netIncome)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
};

export default AnnualBars;
