import AnnualBars from '@/components/stock/AnnualBars';
import { formatINR, formatINRCompact } from '@/lib/currency';

const pct = (v?: number) => (v === undefined ? '—' : `${(v * 100).toFixed(2)}%`);
const ratio = (v?: number) => (v === undefined ? '—' : v.toFixed(2));

const RECOMMENDATION_LABELS: Record<string, string> = {
    strong_buy: 'Strong Buy',
    buy: 'Buy',
    hold: 'Hold',
    underperform: 'Underperform',
    sell: 'Sell',
};

const Financials = ({ overview }: { overview: CompanyOverview | null }) => {
    const m = overview?.metrics;
    if (!m) {
        return <p className="text-sm text-gray-500">Financial data isn&apos;t available for this symbol.</p>;
    }

    const rows = [
        { label: 'Market Cap', value: formatINRCompact(m.marketCap) },
        { label: 'P/E (TTM)', value: ratio(m.trailingPE) },
        { label: 'Forward P/E', value: ratio(m.forwardPE) },
        { label: 'EPS (TTM)', value: formatINR(m.trailingEps) },
        { label: 'Revenue (TTM)', value: formatINRCompact(m.totalRevenue) },
        { label: 'Revenue Growth', value: pct(m.revenueGrowth) },
        { label: 'Profit Margin', value: pct(m.profitMargin) },
        { label: 'Operating Margin', value: pct(m.operatingMargin) },
        { label: 'Return on Equity', value: pct(m.returnOnEquity) },
        { label: 'Debt / Equity', value: m.debtToEquity === undefined ? '—' : `${m.debtToEquity.toFixed(1)}%` },
        { label: 'Total Cash', value: formatINRCompact(m.totalCash) },
        { label: 'Total Debt', value: formatINRCompact(m.totalDebt) },
        { label: 'Dividend Yield', value: pct(m.dividendYield) },
        { label: 'Beta', value: ratio(m.beta) },
    ];

    const recommendation = m.recommendationKey ? RECOMMENDATION_LABELS[m.recommendationKey] : undefined;

    return (
        <div className="flex flex-col gap-5">
            {(recommendation || m.targetMeanPrice !== undefined) && (
                <div className="flex flex-wrap gap-6 rounded-md border border-gray-700 bg-gray-900/40 p-3 text-sm">
                    {recommendation && (
                        <div>
                            <p className="text-xs text-gray-500">Analyst consensus{m.analystCount ? ` (${m.analystCount})` : ''}</p>
                            <p className="font-semibold text-gray-100">{recommendation}</p>
                        </div>
                    )}
                    {m.targetMeanPrice !== undefined && (
                        <div>
                            <p className="text-xs text-gray-500">Avg. price target</p>
                            <p className="font-semibold text-gray-100 tabular-nums">{formatINR(m.targetMeanPrice)}</p>
                        </div>
                    )}
                </div>
            )}

            <dl className="grid gap-x-6 text-sm tabular-nums sm:grid-cols-2 xl:grid-cols-1">
                {rows.map((r) => (
                    <div key={r.label} className="flex justify-between gap-2 border-b border-gray-700/60 py-1.5">
                        <dt className="text-gray-500">{r.label}</dt>
                        <dd className="text-right text-gray-100">{r.value}</dd>
                    </div>
                ))}
            </dl>

            {overview.annual.length > 0 && (
                <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-300">Annual results</h4>
                    <AnnualBars years={overview.annual} />
                </div>
            )}

            <p className="text-xs text-gray-500">
                Reported in {overview.financialCurrency}; amounts shown in INR at today&apos;s exchange rate.
            </p>
        </div>
    );
};

export default Financials;
