import { CHART_COLORS } from '@/lib/market/chart-colors';

// Tiny trend line; colour and the end marker's arrow follow the period's
// direction. The accessible label states the start→end change in words.
const Sparkline = ({ values, width = 96, height = 28, label }: { values?: number[]; width?: number; height?: number; label: string }) => {
    if (!values || values.length < 2) return <span className="text-xs text-gray-600">—</span>;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = 3;
    const pts = values.map((v, i) => [
        pad + (i / (values.length - 1)) * (width - pad * 2),
        pad + (1 - (v - min) / span) * (height - pad * 2),
    ]);
    const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;
    const color = change >= 0 ? CHART_COLORS.up : CHART_COLORS.down;
    const [lx, ly] = pts[pts.length - 1];

    return (
        <svg width={width} height={height} role="img" aria-label={`${label}: ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% over the period`}>
            <title>{`${change >= 0 ? '+' : ''}${change.toFixed(2)}% over 1 month`}</title>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
            <circle cx={lx} cy={ly} r={2.5} fill={color} />
        </svg>
    );
};

export default Sparkline;
