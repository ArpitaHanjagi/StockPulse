'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, TrendingUp, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from '@/components/ui/command';
import { searchStocks } from '@/lib/actions/market.actions';
import { addToWatchlist, removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { getRecentSearches, addRecentSearch, clearRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { displaySymbol } from '@/lib/market/symbols';

const toggleWatchlistFlag = (symbol: string) => (list: StockWithWatchlistStatus[]) =>
    list.map((s) => (s.symbol === symbol ? { ...s, isInWatchlist: !s.isInWatchlist } : s));

const SearchCommand = ({
    renderAs = 'button',
    label = 'Search',
    initialStocks,
    shortcut = true,
    triggerClassName,
    triggerContent,
}: SearchCommandProps) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [defaultStocks, setDefaultStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
    const [results, setResults] = useState<StockWithWatchlistStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => getRecentSearches());

    const trimmedQuery = query.trim();
    const stocks = trimmedQuery ? results : defaultStocks;
    const showLoading = loading && !!trimmedQuery;
    const showError = error && !!trimmedQuery && !showLoading;
    const resultCount = stocks.length;
    const showEmptyState = !showLoading && !showError && resultCount === 0;
    const showRecent = !showLoading && !showError && !trimmedQuery && recentSearches.length > 0;

    // Only one instance should own the Ctrl/⌘+K shortcut.
    useEffect(() => {
        if (!shortcut) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcut]);

    useEffect(() => {
        if (!open || !trimmedQuery) return;

        const timeout = setTimeout(() => {
            setLoading(true);
            setError(false);
            searchStocks(trimmedQuery)
                .then(setResults)
                .catch((e) => {
                    console.error('Search failed', e);
                    setError(true);
                    setResults([]);
                })
                .finally(() => setLoading(false));
        }, 300);

        return () => clearTimeout(timeout);
    }, [trimmedQuery, open]);

    // Optimistic: flip the star immediately and flip it back on failure.
    const handleToggleWatchlist = useCallback(async (stock: StockWithWatchlistStatus) => {
        const toggle = toggleWatchlistFlag(stock.symbol);
        setDefaultStocks(toggle);
        setResults(toggle);

        const result = stock.isInWatchlist
            ? await removeFromWatchlist(stock.symbol)
            : await addToWatchlist(stock.symbol, stock.name);

        if (!result.success) {
            setDefaultStocks(toggle);
            setResults(toggle);
            toast.error(result.error ?? 'Something went wrong');
            return;
        }

        toast.success(
            stock.isInWatchlist ? `Removed ${displaySymbol(stock.symbol)} from watchlist` : `Added ${displaySymbol(stock.symbol)} to watchlist`
        );
    }, []);

    const handleSelect = useCallback(
        (stock: { symbol: string; name: string }) => {
            addRecentSearch({ symbol: stock.symbol, name: stock.name });
            setRecentSearches(getRecentSearches());
            setOpen(false);
            router.push(`/stocks/${stock.symbol}`);
        },
        [router]
    );

    const handleClearRecent = () => {
        clearRecentSearches();
        setRecentSearches([]);
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className={triggerClassName ?? (renderAs === 'text' ? 'search-text' : 'search-btn')}
                aria-label={label}
            >
                {triggerContent ?? label}
            </button>

            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                className="search-dialog"
                title="Search stocks"
                description="Search for stocks by symbol or company name"
            >
                <Command shouldFilter={false} className="!bg-gray-800">
                    <div className="search-field">
                        <CommandInput
                            className="search-input"
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search stocks by symbol or name..."
                        />
                        {showLoading && <Loader2 className="search-loader" />}
                    </div>

                    <CommandList className="search-list">
                        {showLoading && (
                            <div className="search-list-indicator flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="size-4 animate-spin" /> Searching...
                            </div>
                        )}

                        {showError && (
                            <div className="search-list-empty">
                                Something went wrong while searching. Please try again.
                            </div>
                        )}

                        {showEmptyState && (
                            <CommandEmpty className="search-list-empty">
                                {trimmedQuery ? `No results found for "${trimmedQuery}"` : 'No stocks available.'}
                            </CommandEmpty>
                        )}

                        {!showLoading && !showError && resultCount > 0 && (
                            <>
                                {showRecent && (
                                    <CommandGroup
                                        heading={
                                            <div className="flex w-full items-center justify-between">
                                                <span>Recent Searches</span>
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-yellow-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClearRecent();
                                                    }}
                                                >
                                                    <X className="size-3" /> Clear
                                                </button>
                                            </div>
                                        }
                                    >
                                        {recentSearches.map((recent) => (
                                            <CommandItem
                                                key={`recent-${recent.symbol}`}
                                                className="search-item"
                                                value={`recent ${recent.symbol} ${recent.name}`}
                                                onSelect={() => handleSelect(recent)}
                                            >
                                                <div className="search-item-link">
                                                    <TrendingUp className="opacity-60" />
                                                    <span className="search-item-name">{recent.name}</span>
                                                    <span className="ml-auto text-xs text-gray-500">{displaySymbol(recent.symbol)}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                <CommandGroup heading={trimmedQuery ? `${resultCount} result${resultCount === 1 ? '' : 's'}` : 'Popular Stocks'}>
                                    {stocks.map((stock) => (
                                        <CommandItem
                                            key={stock.symbol}
                                            className="search-item"
                                            value={`${stock.symbol} ${stock.name}`}
                                            onSelect={() => handleSelect(stock)}
                                        >
                                            <div className="search-item-link">
                                                <TrendingUp className="opacity-60" />
                                                <span className="search-item-name">{stock.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {displaySymbol(stock.symbol)}
                                                    {trimmedQuery && stock.exchange ? ` · ${stock.exchange}` : ''}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="ml-auto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleToggleWatchlist(stock);
                                                    }}
                                                    aria-label={
                                                        stock.isInWatchlist
                                                            ? `Remove ${stock.symbol} from watchlist`
                                                            : `Add ${stock.symbol} to watchlist`
                                                    }
                                                >
                                                    <Star
                                                        className={
                                                            stock.isInWatchlist
                                                                ? 'size-4 fill-yellow-500 text-yellow-500'
                                                                : 'size-4 text-gray-500'
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </CommandDialog>
        </>
    );
};

export default SearchCommand;
