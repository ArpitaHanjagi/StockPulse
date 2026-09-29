import { Newspaper } from 'lucide-react';
import { getMoveExplanation } from '@/lib/actions/market.actions';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { DRIVER_BADGE } from '@/components/stock/driverBadge';

const timeAgo = (unixSeconds: number) => {
    const h = Math.max(0, Math.round((Date.now() / 1000 - unixSeconds) / 3600));
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

// Server component: "Why is it moving?" card for the stock page.
const WhyMoving = async ({ symbol }: { symbol: string }) => {
    const report = await getMoveExplanation(symbol);
    if (!report) return null;

    const badge = DRIVER_BADGE[report.driver];
    const Icon = badge.icon;
    const accent = report.direction === 'up' ? CHART_COLORS.up : report.direction === 'down' ? CHART_COLORS.down : CHART_COLORS.axis;

    return (
        <section className="min-w-0 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-5" aria-labelledby="why-moving-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="why-moving-title" className="text-lg font-semibold text-gray-100 sm:text-xl">
                    Why is it moving?
                </h2>
                <span className="flex items-center gap-1.5 rounded-full border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-200">
                    <Icon className="size-3.5" style={{ color: accent }} aria-hidden />
                    {badge.label}
                </span>
            </div>

            <p className="flex gap-2 text-base font-medium leading-relaxed text-gray-100">
                <span aria-hidden style={{ color: accent }}>
                    {report.direction === 'up' ? '▲' : report.direction === 'down' ? '▼' : '●'}
                </span>
                {report.headline}
            </p>

            {report.points.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 text-sm text-gray-400">
                    {report.points.map((p) => (
                        <li key={p} className="flex gap-2">
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-gray-500" aria-hidden />
                            {p}
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4 border-t border-gray-700 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <Newspaper className="size-3.5" aria-hidden /> Related headlines
                </p>
                {report.headlines.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                        {report.headlines.map((h) => (
                            <li key={h.id} className="text-sm">
                                <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-yellow-500">
                                    {h.headline}
                                </a>
                                <span className="ml-2 text-xs text-gray-500">
                                    {h.source} · {timeAgo(h.datetime)}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No headlines naming this company in the last 3 days.</p>
                )}
            </div>

            <p className="mt-3 text-xs text-gray-500">
                Automated from price, volume and headline data: it shows how the stock moved, not a confirmed reason. Not investment advice.
            </p>
        </section>
    );
};

export const WhyMovingSkeleton = () => (
    <div className="h-52 animate-pulse rounded-lg border border-gray-700 bg-gray-800 motion-reduce:animate-none" aria-hidden />
);

export default WhyMoving;
