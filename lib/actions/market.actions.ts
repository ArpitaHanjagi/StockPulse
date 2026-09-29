'use server';

import { unstable_rethrow } from "next/navigation";
import { HEATMAP_SECTORS, INDIAN_STOCK_NAMES, MARKET_GROUPS, POPULAR_STOCK_NAMES } from "@/lib/constants";
import { getWatchlistSymbols } from "@/lib/actions/watchlist.actions";
import { getRateSeriesToInr, getRateToInr } from "@/lib/currency";
import {
    CHART_RANGES,
    fetchYahooHistory,
    fetchYahooMonthly,
    fetchYahooNews,
    fetchYahooQuotes,
    fetchYahooSummary,
    searchYahoo,
    type ChartRange,
    type YahooNewsItem,
    type YahooQuote,
} from "@/lib/market/yahoo";
import { computeTechnicals, type TechnicalSummary } from "@/lib/market/technicals";
import { displaySymbol, isIndianSymbol } from "@/lib/market/symbols";
import { explainMove } from "@/lib/market/explain";
import { marketBenchmark, sectorBenchmark } from "@/lib/market/sectors";
import { MARKET_SESSIONS, getMarketStatus } from "@/lib/market/hours";
import { lookupAtOrBefore, monthKey, simulateFd, simulateSip, xirr } from "@/lib/market/sip";

const GLOBAL_NEWS_QUERIES = ['stock market', 'wall street', 'earnings', 'federal reserve'];
// Yahoo's search returns genuinely Indian market stories for these terms
// (broader phrases like "Indian stock market" return nothing).
const INDIA_NEWS_QUERIES = ['Sensex', 'Nifty'];

// US-listed ADRs of Indian companies — Yahoo often tags Indian-company
// stories with the ADR rather than the NSE symbol.
const INDIAN_ADRS: Record<string, string> = {
    'INFY.NS': 'INFY',
    'HDFCBANK.NS': 'HDB',
    'ICICIBANK.NS': 'IBN',
    'WIPRO.NS': 'WIT',
    'DRREDDY.NS': 'RDY',
};

// Quotes come back in the stock's listing currency. Every price field is
// converted to INR with a live exchange rate so the rest of the app can
// format and display these numbers directly. `changePercent` is a ratio and
// is unaffected by the conversion. If the rate is unavailable the price
// fields are left undefined (shown as "—") rather than guessed. Index
// levels (S&P 500, Nifty 50, …) are points, not money, and stay as-is.
const toStockQuote = (quote: YahooQuote, rate: number | null): StockQuote => {
    const isIndex = quote.quoteType === 'INDEX';
    const convert = (value?: number) => (value === undefined ? undefined : isIndex ? value : rate === null ? undefined : value * rate);
    const change =
        quote.price !== undefined && quote.previousClose !== undefined ? quote.price - quote.previousClose : undefined;

    return {
        symbol: quote.symbol,
        name: INDIAN_STOCK_NAMES[quote.symbol] ?? quote.name,
        exchange: quote.exchange,
        currency: quote.currency,
        isIndex,
        inrRate: isIndex ? undefined : rate ?? undefined,
        price: convert(quote.price),
        change: convert(change),
        changePercent: quote.changePercent,
        previousClose: convert(quote.previousClose),
        dayHigh: convert(quote.dayHigh),
        dayLow: convert(quote.dayLow),
        yearHigh: convert(quote.yearHigh),
        yearLow: convert(quote.yearLow),
        volume: quote.volume,
        marketCap: convert(quote.marketCap),
        peRatio: quote.peRatio,
        marketTime: quote.marketTime,
    };
};

// Fetches all symbols in one batch request, so callers with many rows
// (watchlists, alerts, the dashboard) make a single upstream call.
export const getQuotes = async (symbols: string[]): Promise<Record<string, StockQuote | null>> => {
    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    const result: Record<string, StockQuote | null> = Object.fromEntries(unique.map((s) => [s, null]));
    if (unique.length === 0) return result;

    try {
        const quotes = await fetchYahooQuotes(unique);
        const currencies = [...new Set(quotes.map((q) => q.currency))];
        const rates = Object.fromEntries(await Promise.all(currencies.map(async (c) => [c, await getRateToInr(c)] as const)));

        for (const quote of quotes) {
            result[quote.symbol.toUpperCase()] = toStockQuote(quote, rates[quote.currency] ?? null);
        }
    } catch (e) {
        unstable_rethrow(e);
        console.error('Failed to fetch quotes', e);
    }
    return result;
};

export const getQuote = async (symbol: string): Promise<StockQuote | null> => {
    const upper = symbol.toUpperCase();
    return (await getQuotes([upper]))[upper] ?? null;
};

// Price history in the listing currency (historical prices can't honestly
// be converted with today's exchange rate).
export const getPriceHistory = async (symbol: string, range: ChartRange): Promise<PriceHistory | null> => {
    if (!(range in CHART_RANGES)) return null;
    try {
        const history = await fetchYahooHistory(symbol.toUpperCase(), range);
        if (!history) return null;
        return { symbol: symbol.toUpperCase(), range, ...history };
    } catch (e) {
        unstable_rethrow(e);
        console.error(`Failed to fetch price history for ${symbol}`, e);
        return null;
    }
};

export const getTechnicalSummary = async (symbol: string): Promise<TechnicalSummary | null> => {
    const history = await getPriceHistory(symbol, '1Y');
    return history ? computeTechnicals(history.candles) : null;
};

export const getCompanyOverview = async (symbol: string): Promise<CompanyOverview | null> => {
    try {
        const summary = await fetchYahooSummary(symbol.toUpperCase());
        if (!summary) return null;

        const [finRate, tradeRate] = await Promise.all([
            getRateToInr(summary.financialCurrency),
            getRateToInr(summary.tradingCurrency),
        ]);
        const fin = (v?: number) => (v === undefined || finRate === null ? undefined : v * finRate);
        const trade = (v?: number) => (v === undefined || tradeRate === null ? undefined : v * tradeRate);
        const m = summary.metrics;

        return {
            profile: summary.profile,
            financialCurrency: summary.financialCurrency,
            metrics: {
                marketCap: trade(m.marketCap),
                trailingPE: m.trailingPE,
                forwardPE: m.forwardPE,
                trailingEps: trade(m.trailingEps),
                dividendYield: m.dividendYield,
                beta: m.beta,
                profitMargin: m.profitMargin,
                operatingMargin: m.operatingMargin,
                returnOnEquity: m.returnOnEquity,
                revenueGrowth: m.revenueGrowth,
                debtToEquity: m.debtToEquity,
                totalRevenue: fin(m.totalRevenue),
                totalCash: fin(m.totalCash),
                totalDebt: fin(m.totalDebt),
                targetMeanPrice: trade(m.targetMeanPrice),
                recommendationKey: m.recommendationKey,
                analystCount: m.analystCount,
            },
            annual: summary.annual.map((y) => ({ year: y.year, revenue: fin(y.revenue), netIncome: fin(y.netIncome) })),
        };
    } catch (e) {
        unstable_rethrow(e);
        console.error(`Failed to fetch company overview for ${symbol}`, e);
        return null;
    }
};

// Everything the dashboard needs in one batch quote request.
export const getMarketBoard = async (): Promise<MarketBoard> => {
    const symbols = [
        ...MARKET_GROUPS.flatMap((g) => g.symbols.map((s) => s.symbol)),
        ...Object.values(HEATMAP_SECTORS).flat().flatMap((s) => s.symbols),
    ];
    const quotes = await getQuotes(symbols);
    const toSectors = (sectors: { name: string; symbols: string[] }[]): HeatmapSector[] =>
        sectors.map((sector) => ({
            name: sector.name,
            items: sector.symbols.map((symbol) => ({ symbol, quote: quotes[symbol.toUpperCase()] ?? null })),
        }));

    return {
        groups: MARKET_GROUPS.map((g) => ({
            title: g.title,
            items: g.symbols.map((s) => ({ symbol: s.symbol, name: s.name, quote: quotes[s.symbol.toUpperCase()] ?? null })),
        })),
        sectors: {
            india: toSectors(HEATMAP_SECTORS.india),
            us: toSectors(HEATMAP_SECTORS.us),
        },
    };
};

const DEFAULT_STOCKS: Stock[] = Object.keys(POPULAR_STOCK_NAMES).map((symbol) => ({
    symbol,
    name: POPULAR_STOCK_NAMES[symbol],
    exchange: symbol.endsWith('.NS') ? 'NSE' : symbol.endsWith('.BO') ? 'BSE' : 'US',
    type: 'Stock',
}));

export const searchStocks = async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    const trimmed = query?.trim();
    const watchlistSymbols = await getWatchlistSymbols();

    // Errors are intentionally left to propagate here so the search UI can
    // distinguish "no results" from "the request failed".
    const stocks: Stock[] = trimmed ? (await searchYahoo(trimmed)).slice(0, 15) : DEFAULT_STOCKS;

    return stocks.map((stock) => ({
        ...stock,
        isInWatchlist: watchlistSymbols.includes(stock.symbol.toUpperCase()),
    }));
};

const pickThumbnail = (item: YahooNewsItem) => {
    const resolutions = item.thumbnail?.resolutions ?? [];
    return (resolutions.find((r) => r.tag === 'original') ?? resolutions[0])?.url;
};

const toArticle = (item: YahooNewsItem): MarketNewsArticle => ({
    id: item.uuid,
    headline: item.title,
    source: item.publisher ?? 'Unknown',
    url: item.link,
    datetime: item.providerPublishTime ?? 0,
    related: item.relatedTickers?.slice(0, 3).join(', ') ?? '',
    image: pickThumbnail(item),
});

// Runs several news searches and merges them, newest first, without
// duplicates. Individual query failures are tolerated.
type NewsQuery = { q: string; accept?: (item: YahooNewsItem) => boolean };

const collectNews = async (queries: (string | NewsQuery)[], perQuery: number, limit: number) => {
    const specs = queries.map((q) => (typeof q === 'string' ? { q } : q));
    const settled = await Promise.allSettled(
        specs.map(async ({ q, accept }) => (await fetchYahooNews(q, perQuery)).filter((item) => !accept || accept(item)))
    );

    const seen = new Set<string>();
    const articles: MarketNewsArticle[] = [];

    for (const result of settled) {
        if (result.status === 'rejected') {
            console.error('Failed to fetch news', result.reason);
            continue;
        }
        for (const item of result.value) {
            if (seen.has(item.uuid)) continue;
            seen.add(item.uuid);
            articles.push(toArticle(item));
        }
    }

    return articles.sort((a, b) => b.datetime - a.datetime).slice(0, limit);
};

export const getMarketNews = async (region: 'india' | 'global' = 'india'): Promise<MarketNewsArticle[]> =>
    region === 'india' ? collectNews(INDIA_NEWS_QUERIES, 10, 24) : collectNews(GLOBAL_NEWS_QUERIES, 10, 24);

// Per-stock news. Yahoo's search by NSE symbol returns nothing and a search
// by company name returns loosely related stories, so for Indian stocks we
// search by name but keep only items Yahoo tags with this company (its NSE
// or BSE listing, or its US ADR).
const stockNewsQuery = (symbol: string): NewsQuery => {
    if (!isIndianSymbol(symbol)) return { q: symbol };
    const accepted = new Set([symbol, symbol.replace(/\.NS$/, '.BO'), INDIAN_ADRS[symbol]].filter(Boolean));
    const name = INDIAN_STOCK_NAMES[symbol] ?? displaySymbol(symbol);
    // The headline must also name the company — Yahoo tags some stories
    // with a ticker that only gets a passing mention.
    const keywords = [name, name.split(' ')[0], displaySymbol(symbol), INDIAN_ADRS[symbol]]
        .filter((k): k is string => !!k && k.length >= 3)
        .map((k) => k.toLowerCase());
    return {
        q: name,
        accept: (item) =>
            (item.relatedTickers ?? []).some((t) => accepted.has(t)) &&
            keywords.some((k) => item.title.toLowerCase().includes(k)),
    };
};

export const getStockNews = async (symbols: string[], limit = 6): Promise<MarketNewsArticle[]> => {
    if (symbols.length === 0) return [];
    return collectNews(symbols.slice(0, 5).map(stockNewsQuery), 10, limit);
};

const HEADLINE_MAX_AGE_S = 3 * 24 * 60 * 60;

// "Why is it moving?" for one stock: compares its latest move with its
// market and sector, checks volume, opening gap and 52-week extremes, and
// attaches recent headlines that name the company. Descriptive only — it
// never asserts a cause it can't verify.
export const getMoveExplanation = async (symbol: string): Promise<MoveReport | null> => {
    try {
        const upper = symbol.toUpperCase();
        const indian = isIndianSymbol(upper);
        const market = marketBenchmark(indian);

        const [summary, history] = await Promise.all([
            fetchYahooSummary(upper).catch(() => null),
            getPriceHistory(upper, '1M'),
        ]);
        const sector = sectorBenchmark(indian, summary?.profile.sector, summary?.profile.industry);
        const quotes = await getQuotes([upper, market.symbol, ...(sector ? [sector.symbol] : [])]);
        const quote = quotes[upper];
        if (!quote || quote.isIndex) return null;

        // 20-day average volume excludes the latest (possibly partial) bar;
        // the opening gap uses the latest bar vs the one before, both in the
        // listing currency.
        const candles = history?.candles ?? [];
        const last = candles.at(-1);
        const prior = candles.at(-2);
        const past = candles.slice(-21, -1).filter((c) => c.v > 0);
        const avgVolume20 = past.length >= 10 ? past.reduce((sum, c) => sum + c.v, 0) / past.length : undefined;
        const gapPercent = last && prior ? ((last.o - prior.c) / prior.c) * 100 : undefined;

        const session = MARKET_SESSIONS.find((m) => m.id === (indian ? 'IN' : 'US'))!;
        const sessionOpen = getMarketStatus(session).isOpen;

        const explanation = explainMove({
            name: quote.name,
            changePercent: quote.changePercent,
            price: quote.price,
            gapPercent,
            yearHigh: quote.yearHigh,
            yearLow: quote.yearLow,
            volume: quote.volume,
            avgVolume20,
            market: { label: market.label, changePercent: quotes[market.symbol.toUpperCase()]?.changePercent },
            sector: sector ? { label: sector.label, changePercent: quotes[sector.symbol.toUpperCase()]?.changePercent } : undefined,
            sessionOpen,
        });
        if (!explanation) return null;

        // Only recent headlines that actually name the company (Yahoo tags
        // some stories with tickers that get just a passing mention).
        const cutoff = Date.now() / 1000 - HEADLINE_MAX_AGE_S;
        const keywords = [quote.name.split(/[\s,.]+/)[0], displaySymbol(upper)]
            .filter((k) => k.length >= 3)
            .map((k) => k.toLowerCase());
        const headlines = (await getStockNews([upper], 10))
            .filter((a) => a.datetime >= cutoff && keywords.some((k) => a.headline.toLowerCase().includes(k)))
            .slice(0, 3);

        return { ...explanation, headlines, sessionOpen };
    } catch (e) {
        unstable_rethrow(e);
        console.error(`Failed to explain move for ${symbol}`, e);
        return null;
    }
};

const SIP_YEARS = [1, 3, 5, 10];
const FD_RATE = 0.07; // assumed fixed-deposit rate, shown to users

// SIP backtest: invest `monthly` rupees at each month's opening price for
// `years`, compared with the same SIP in the home-market index and in a
// fixed deposit. Foreign listings convert each instalment at that month's
// exchange rate.
export const getSipBacktest = async (symbol: string, monthly: number, years: number): Promise<SipResult | { error: string }> => {
    if (!Number.isFinite(monthly) || monthly < 500 || monthly > 10_00_000) return { error: 'Enter a monthly amount between ₹500 and ₹10,00,000.' };
    if (!SIP_YEARS.includes(years)) return { error: 'Choose 1, 3, 5 or 10 years.' };

    try {
        const upper = symbol.toUpperCase();
        const bench = marketBenchmark(isIndianSymbol(upper));
        const [stock, index, quote] = await Promise.all([
            fetchYahooMonthly(upper, years),
            fetchYahooMonthly(bench.symbol, years),
            getQuote(upper),
        ]);
        if (!stock || stock.bars.length < 2) return { error: 'Not enough price history for this stock.' };

        const from = new Date(stock.bars[0].t * 1000 - 7 * 86400_000);
        const to = new Date();
        const [stockFx, indexFx] = await Promise.all([
            getRateSeriesToInr(stock.currency, from, to),
            index ? getRateSeriesToInr(index.currency, from, to) : Promise.resolve(null),
        ]);
        if (stock.currency !== 'INR' && !stockFx) return { error: `Historical ${stock.currency}/INR rates are unavailable right now.` };

        const rateFn = (series: { t: number; v: number }[] | null) => (t: number) => (series ? lookupAtOrBefore(series, t) : 1);

        // The current month's bar is partial, so its close is the latest
        // price: the final value reflects today's market.
        const sim = simulateSip(stock.bars, monthly, rateFn(stockFx));
        const months = sim.points.map((p) => p.t);

        // Benchmark SIP on the same months (matched by calendar month).
        const indexByMonth = new Map((index?.bars ?? []).map((b) => [monthKey(b.t, index!.timezone), b]));
        const indexBars = months
            .map((t) => indexByMonth.get(monthKey(t, stock.timezone)))
            .filter((b): b is { t: number; o: number; c: number } => !!b);
        const benchSim = indexBars.length === months.length ? simulateSip(indexBars, monthly, rateFn(indexFx)) : null;

        const fd = simulateFd(months, monthly, FD_RATE);
        const end = Math.floor(Date.now() / 1000);
        const finalOf = (points: { value: number }[]) => points.at(-1)?.value ?? 0;
        const withFinal = (cf: { t: number; amount: number }[], value: number) => [...cf, { t: end, amount: value }];

        const stockValue = finalOf(sim.points);
        const benchValue = benchSim ? finalOf(benchSim.points) : undefined;
        const fdValue = finalOf(fd);

        const fxNote =
            stockFx && stock.currency !== 'INR'
                ? `${stock.currency}/INR moved from ${stockFx[0].v.toFixed(2)} to ${stockFx.at(-1)!.v.toFixed(2)} over this period, which is included in the rupee value.`
                : undefined;

        return {
            symbol: upper,
            name: quote?.name ?? displaySymbol(upper),
            monthly,
            years,
            months: months.length,
            startDate: months[0],
            benchmarkLabel: bench.label,
            fdRate: FD_RATE,
            points: sim.points.map((p, i) => ({
                t: p.t,
                invested: p.invested,
                stock: p.value,
                benchmark: benchSim?.points[i]?.value,
                fd: fd[i].value,
            })),
            summary: {
                invested: sim.invested,
                stock: { value: stockValue, xirr: xirr(withFinal(sim.cashflows, stockValue)) },
                benchmark: benchSim && benchValue !== undefined ? { value: benchValue, xirr: xirr(withFinal(benchSim.cashflows, benchValue)) } : undefined,
                fd: { value: fdValue, xirr: xirr(withFinal(sim.cashflows, fdValue)) },
            },
            fxNote,
            shortHistory: months.length < years * 12 - 1,
        };
    } catch (e) {
        unstable_rethrow(e);
        console.error(`SIP backtest failed for ${symbol}`, e);
        return { error: 'Could not run the backtest right now. Please try again.' };
    }
};
