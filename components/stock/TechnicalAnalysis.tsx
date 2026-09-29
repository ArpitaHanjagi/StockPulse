import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import type { IndicatorResult, Rating, Signal, TechnicalSummary } from '@/lib/market/technicals';

const RATINGS: Rating[] = ['Strong Sell', 'Sell', 'Neutral', 'Buy', 'Strong Buy'];

// Signals are always shown as icon + word; colour only reinforces them.
const SignalBadge = ({ signal }: { signal: Signal }) => {
    const Icon = signal === 'Buy' ? ArrowUp : signal === 'Sell' ? ArrowDown : Minus;
    const color = signal === 'Buy' ? CHART_COLORS.up : signal === 'Sell' ? CHART_COLORS.down : CHART_COLORS.axis;
    return (
        <span className="inline-flex items-center gap-1 font-medium text-gray-100">
            <Icon className="size-3.5" style={{ color }} aria-hidden />
            {signal}
        </span>
    );
};

const IndicatorTable = ({ title, rows }: { title: string; rows: IndicatorResult[] }) => (
    <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-300">{title}</h4>
        <table className="w-full text-left text-sm tabular-nums">
            <thead className="text-xs text-gray-500">
                <tr>
                    <th className="py-1 font-medium">Indicator</th>
                    <th className="py-1 text-right font-medium">Value</th>
                    <th className="py-1 text-right font-medium">Action</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r) => (
                    <tr key={r.name} className="border-t border-gray-700/60">
                        <td className="py-1.5 text-gray-400">{r.name}</td>
                        <td className="py-1.5 text-right text-gray-200">
                            {r.value === undefined ? '—' : r.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 text-right">
                            <SignalBadge signal={r.signal} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TechnicalAnalysis = ({ summary }: { summary: TechnicalSummary | null }) => {
    if (!summary) {
        return <p className="text-sm text-gray-500">Not enough price history to compute technical indicators.</p>;
    }

    const activeIndex = RATINGS.indexOf(summary.rating);
    const total = summary.counts.Buy + summary.counts.Sell + summary.counts.Neutral;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Summary · daily</p>
                <p className="text-3xl font-semibold text-gray-100">{summary.rating}</p>

                {/* Five-step scale; the active step is marked by position and a caret, not colour alone */}
                <div className="w-full max-w-md">
                    <div className="grid grid-cols-5 gap-0.5">
                        {RATINGS.map((r, i) => (
                            <div
                                key={r}
                                className="h-2 first:rounded-l last:rounded-r"
                                style={{
                                    background:
                                        i < 2 ? CHART_COLORS.down : i > 2 ? CHART_COLORS.up : CHART_COLORS.heatNeutral,
                                    opacity: i === activeIndex ? 1 : 0.3,
                                }}
                            />
                        ))}
                    </div>
                    <div className="mt-1 grid grid-cols-5 text-center text-[11px] text-gray-500">
                        {RATINGS.map((r, i) => (
                            <span key={r} className={i === activeIndex ? 'font-semibold text-gray-100' : ''}>
                                {i === activeIndex ? '▲ ' : ''}
                                {r}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex gap-6 text-sm tabular-nums">
                    <span className="text-gray-400">Buy <span className="font-semibold text-gray-100">{summary.counts.Buy}</span></span>
                    <span className="text-gray-400">Neutral <span className="font-semibold text-gray-100">{summary.counts.Neutral}</span></span>
                    <span className="text-gray-400">Sell <span className="font-semibold text-gray-100">{summary.counts.Sell}</span></span>
                    <span className="text-gray-500">of {total} indicators</span>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <IndicatorTable title="Oscillators" rows={summary.oscillators} />
                <IndicatorTable title="Moving Averages" rows={summary.movingAverages} />
            </div>

            <p className="text-xs text-gray-500">
                Computed from one year of daily prices. For information only — not investment advice.
            </p>
        </div>
    );
};

export default TechnicalAnalysis;
