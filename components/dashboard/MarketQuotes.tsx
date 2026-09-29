import Link from 'next/link';
import { formatINRCompact, formatPercent } from '@/lib/currency';
import { formatQuoteValue } from '@/lib/market/format';

const MarketQuotes = ({ groups }: { groups: MarketBoard['groups'] }) => (
    <div className="flex flex-col gap-5">
        {groups.map((group) => (
            <div key={group.title} className="overflow-x-auto">
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{group.title}</h4>
                <table className="w-full text-left text-sm tabular-nums">
                    <thead className="text-xs text-gray-500">
                        <tr>
                            <th className="py-1.5 font-medium">Name</th>
                            <th className="py-1.5 text-right font-medium">Price</th>
                            <th className="py-1.5 text-right font-medium">Change</th>
                            <th className="hidden py-1.5 text-right font-medium sm:table-cell">Market Cap</th>
                            <th className="hidden py-1.5 text-right font-medium sm:table-cell">P/E</th>
                        </tr>
                    </thead>
                    <tbody>
                        {group.items.map(({ symbol, name, quote }) => (
                            <tr key={symbol} className="border-t border-gray-700/60">
                                <td className="py-2">
                                    {quote?.isIndex ? (
                                        <span className="text-gray-100">{name}</span>
                                    ) : (
                                        <Link href={`/stocks/${symbol}`} className="text-gray-100 hover:text-yellow-500">
                                            {name}
                                        </Link>
                                    )}
                                    <span className="ml-2 text-xs text-gray-500">{symbol}</span>
                                </td>
                                <td className="py-2 text-right text-gray-100">{formatQuoteValue(quote)}</td>
                                <td className="py-2 text-right text-gray-100">
                                    {quote?.changePercent === undefined
                                        ? '—'
                                        : `${quote.changePercent >= 0 ? '▲' : '▼'} ${formatPercent(quote.changePercent)}`}
                                </td>
                                <td className="hidden py-2 text-right text-gray-400 sm:table-cell">
                                    {quote?.isIndex ? '—' : formatINRCompact(quote?.marketCap)}
                                </td>
                                <td className="hidden py-2 text-right text-gray-400 sm:table-cell">
                                    {quote?.peRatio !== undefined ? quote.peRatio.toFixed(1) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ))}
    </div>
);

export default MarketQuotes;
