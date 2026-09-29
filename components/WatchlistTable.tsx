'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Bell, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AlertModal from '@/components/AlertModal';
import PriceChange from '@/components/PriceChange';
import Sparkline from '@/components/charts/Sparkline';
import { removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { useLiveQuotes, usePriceFlash } from '@/hooks/useLiveQuotes';
import { toStockWithData } from '@/lib/market/format';
import { cn } from '@/lib/utils';
import { displaySymbol } from '@/lib/market/symbols';

type SortKey = 'company' | 'symbol' | 'currentPrice' | 'changePercent' | 'marketCapValue' | 'peRatioValue' | 'volumeValue';

// Secondary columns appear only once there's room, so the table always fits
// beside the alerts panel without horizontal scrolling.
const SHOW_FROM = { xl: 'hidden xl:table-cell', '2xl': 'hidden 2xl:table-cell' } as const;

const COLUMNS: { key: SortKey | null; label: string; align?: 'right'; from?: keyof typeof SHOW_FROM }[] = [
    { key: 'company', label: 'Company' },
    { key: 'currentPrice', label: 'Price', align: 'right' },
    { key: 'changePercent', label: 'Change', align: 'right' },
    { key: null, label: '1M Trend' },
    { key: 'marketCapValue', label: 'Market Cap', align: 'right', from: 'xl' },
    { key: 'peRatioValue', label: 'P/E', align: 'right', from: 'xl' },
    { key: 'volumeValue', label: 'Volume', align: 'right', from: '2xl' },
    { key: null, label: 'Actions', align: 'right' },
];

// Price cell that tints briefly when a live refresh changes the price.
const LivePrice = ({ value, text }: { value?: number; text?: string }) => {
    const flash = usePriceFlash(value);
    return (
        <span key={flash.n} className={cn('px-1 tabular-nums', flash.cls)}>
            {text ?? '—'}
        </span>
    );
};

const WatchlistTable = ({ watchlist, sparklines = {} }: WatchlistTableProps) => {
    // Optimistic removal: rows hide immediately and come back on failure.
    const [removed, setRemoved] = useState<Set<string>>(new Set());
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
    const [alertStock, setAlertStock] = useState<StockWithData | null>(null);
    const [alertOpen, setAlertOpen] = useState(false);

    const live = useLiveQuotes(watchlist.map((w) => w.symbol));

    const items = watchlist
        .filter((item) => !removed.has(item.symbol))
        .map((item) => {
            const q = live?.[item.symbol.toUpperCase()];
            return q ? { ...toStockWithData({ symbol: item.symbol, company: item.company }, q), addedAt: item.addedAt } : item;
        });

    if (sort) {
        items.sort((a, b) => {
            const x = a[sort.key];
            const y = b[sort.key];
            if (x === undefined && y === undefined) return 0;
            if (x === undefined) return 1; // missing values always last
            if (y === undefined) return -1;
            const cmp = typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number);
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }

    const toggleSort = (key: SortKey) =>
        setSort((s) =>
            s?.key !== key
                ? { key, dir: key === 'company' || key === 'symbol' ? 'asc' : 'desc' }
                : s.dir === 'desc'
                  ? { key, dir: 'asc' }
                  : s.key === 'company' || s.key === 'symbol'
                    ? { key, dir: 'desc' }
                    : null
        );

    const handleRemove = async (symbol: string) => {
        setRemoved((prev) => new Set(prev).add(symbol));
        const result = await removeFromWatchlist(symbol);

        if (!result.success) {
            setRemoved((prev) => {
                const next = new Set(prev);
                next.delete(symbol);
                return next;
            });
            toast.error(result.error ?? 'Failed to remove from watchlist');
            return;
        }

        toast.success(`Removed ${symbol} from watchlist`);
    };

    const handleAddAlert = (item: StockWithData) => {
        setAlertStock(item);
        setAlertOpen(true);
    };

    if (items.length === 0) {
        return (
            <div className="watchlist-empty-container">
                <div className="watchlist-empty">
                    <Star className="watchlist-star" />
                    <h3 className="empty-title">Your watchlist is empty</h3>
                    <p className="empty-description">
                        Search for stocks and add them to your watchlist to track their prices and set price alerts.
                    </p>
                </div>
            </div>
        );
    }

    const SortIcon = ({ k }: { k: SortKey }) =>
        sort?.key !== k ? (
            <ArrowUpDown className="size-3 opacity-40" />
        ) : sort.dir === 'asc' ? (
            <ArrowUp className="size-3" />
        ) : (
            <ArrowDown className="size-3" />
        );

    return (
        <>
            <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                <span className="size-1.5 rounded-full bg-teal-400" /> Prices refresh every 30 seconds
            </p>

            {/* Phones: cards */}
            <ul className="flex flex-col gap-3 md:hidden">
                {items.map((item) => (
                    <li key={item.symbol} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <Link href={`/stocks/${item.symbol}`} className="min-w-0">
                                <p className="truncate font-semibold text-gray-100">{item.company}</p>
                                <p className="text-xs text-gray-500">{displaySymbol(item.symbol)}</p>
                            </Link>
                            <Sparkline values={sparklines[item.symbol]} label={`${item.symbol} one-month trend`} width={80} />
                        </div>
                        <div className="mt-3 flex items-end justify-between">
                            <div>
                                <p className="text-lg font-semibold text-gray-100">
                                    <LivePrice value={item.currentPrice} text={item.priceFormatted} />
                                </p>
                                <PriceChange percent={item.changePercent} className="text-sm" />
                            </div>
                            <div className="text-right text-xs text-gray-500">
                                <p>Cap {item.marketCap ?? '—'}</p>
                                <p>P/E {item.peRatio ?? '—'}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-700 pt-3">
                            <button className="add-alert" onClick={() => handleAddAlert(item)}>
                                <Bell className="size-3.5" /> Set alert
                            </button>
                            <Button variant="ghost" size="icon" onClick={() => handleRemove(item.symbol)} aria-label={`Remove ${item.symbol} from watchlist`}>
                                <Trash2 className="trash-icon" />
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Tablet and up: sortable table */}
            <div className="watchlist-table hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                    <thead>
                        <tr className="table-header-row">
                            {COLUMNS.map(({ key, label, align, from }) => (
                                <th
                                    key={label}
                                    className={cn('table-header whitespace-nowrap px-3 py-3 text-sm', align === 'right' && 'text-right', from && SHOW_FROM[from])}
                                    aria-sort={key && sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                                >
                                    {key ? (
                                        <button
                                            onClick={() => toggleSort(key)}
                                            className={cn('inline-flex items-center gap-1 hover:text-yellow-500', align === 'right' && 'flex-row-reverse')}
                                        >
                                            {label}
                                            <SortIcon k={key} />
                                        </button>
                                    ) : (
                                        label
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.symbol} className="table-row">
                                <td className="table-cell max-w-44 px-3 py-3">
                                    <Link href={`/stocks/${item.symbol}`} className="group block">
                                        <span className="block truncate group-hover:text-yellow-500">{item.company}</span>
                                        <span className="text-xs font-normal text-gray-500">{displaySymbol(item.symbol)}</span>
                                    </Link>
                                </td>
                                <td className="table-cell whitespace-nowrap px-3 py-3 text-right">
                                    <LivePrice value={item.currentPrice} text={item.priceFormatted} />
                                </td>
                                <td className="table-cell whitespace-nowrap px-3 py-3 text-right text-sm">
                                    <PriceChange percent={item.changePercent} />
                                </td>
                                <td className="table-cell px-3 py-2">
                                    <Sparkline values={sparklines[item.symbol]} label={`${item.symbol} one-month trend`} width={76} />
                                </td>
                                <td className={cn('whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-400', SHOW_FROM.xl)}>{item.marketCap ?? '—'}</td>
                                <td className={cn('px-3 py-3 text-right text-sm font-medium text-gray-400', SHOW_FROM.xl)}>{item.peRatio ?? '—'}</td>
                                <td className={cn('px-3 py-3 text-right text-sm font-medium text-gray-400', SHOW_FROM['2xl'])}>{item.volume ?? '—'}</td>
                                <td className="table-cell px-3 py-3">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-500"
                                            onClick={() => handleAddAlert(item)}
                                            aria-label={`Set a price alert for ${item.symbol}`}
                                            title="Set price alert"
                                        >
                                            <Bell className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-500 hover:bg-red-500/15 hover:text-red-400"
                                            onClick={() => handleRemove(item.symbol)}
                                            aria-label={`Remove ${item.symbol} from watchlist`}
                                            title="Remove from watchlist"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {alertStock && (
                <AlertModal
                    action="Create"
                    open={alertOpen}
                    setOpen={setAlertOpen}
                    alertData={{
                        symbol: alertStock.symbol,
                        company: alertStock.company,
                        alertName: '',
                        alertType: 'upper',
                        threshold: '',
                    }}
                />
            )}
        </>
    );
};

export default WatchlistTable;
