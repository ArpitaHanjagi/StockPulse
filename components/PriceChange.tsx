import { formatINR, formatPercent } from '@/lib/currency';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { cn } from '@/lib/utils';

// Daily change as arrow + signed value. Colour matches the charts (blue up,
// red down) but the arrow and sign carry the meaning on their own.
const PriceChange = ({
    percent,
    amount,
    className,
}: {
    percent?: number;
    amount?: number;
    className?: string;
}) => {
    if (percent === undefined) return <span className={cn('text-gray-500', className)}>—</span>;
    const up = percent >= 0;
    return (
        <span className={cn('tabular-nums', className)} style={{ color: up ? CHART_COLORS.up : CHART_COLORS.down }}>
            {up ? '▲' : '▼'} {amount !== undefined && `${up ? '+' : '−'}${formatINR(Math.abs(amount))} `}
            {amount !== undefined ? `(${formatPercent(percent)})` : formatPercent(percent)}
        </span>
    );
};

export default PriceChange;
