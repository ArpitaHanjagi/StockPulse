import { unstable_rethrow } from 'next/navigation';

// Thin client for Yahoo Finance's public (keyless) JSON endpoints. These are
// the same endpoints finance.yahoo.com itself calls, so no API key or paid
// plan is required. Everything here runs server-side only.

const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
const QUOTE_URL = 'https://query2.finance.yahoo.com/v7/finance/quote';
const SUMMARY_URL = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

// Yahoo rejects requests without a browser-like User-Agent.
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HEADERS = { 'User-Agent': USER_AGENT, Accept: 'application/json' };

const SEARCHABLE_TYPES = new Set(['EQUITY', 'ETF']);

export type YahooQuote = {
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    quoteType: string;
    price?: number;
    previousClose?: number;
    changePercent?: number;
    dayHigh?: number;
    dayLow?: number;
    yearHigh?: number;
    yearLow?: number;
    volume?: number;
    marketCap?: number;
    peRatio?: number;
    marketTime?: number;
};

export type YahooSearchResult = {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
};

export type YahooNewsItem = {
    uuid: string;
    title: string;
    publisher?: string;
    link: string;
    providerPublishTime?: number;
    relatedTickers?: string[];
    thumbnail?: { resolutions?: { url: string; width: number; height: number; tag: string }[] };
};

export type YahooCandle = { t: number; o: number; h: number; l: number; c: number; v: number };

const yahooFetchOnce = async (url: string, revalidateSeconds: number, extraHeaders?: Record<string, string>) => {
    const res = await fetch(url, { headers: { ...HEADERS, ...extraHeaders }, next: { revalidate: revalidateSeconds } });
    if (res.status === 404) return null;
    if (!res.ok) throw Object.assign(new Error(`Yahoo Finance request failed: ${res.status} ${res.statusText}`), { status: res.status });
    return res.json();
};

// query1 and query2 serve the same API. Cloud hosts' shared IPs get rate
// limited (429) or refused more often than home connections, so a failed
// request is retried once on the other host before giving up.
const ALTERNATE_HOST: Record<string, string> = {
    'query1.finance.yahoo.com': 'query2.finance.yahoo.com',
    'query2.finance.yahoo.com': 'query1.finance.yahoo.com',
};
const isRetryable = (e: unknown) => {
    const status = (e as { status?: number }).status;
    return status === undefined || status === 429 || status >= 500;
};

const yahooFetch = async (url: string, revalidateSeconds: number, extraHeaders?: Record<string, string>) => {
    try {
        return await yahooFetchOnce(url, revalidateSeconds, extraHeaders);
    } catch (e) {
        const parsed = new URL(url);
        const alternate = ALTERNATE_HOST[parsed.host];
        if (!alternate || !isRetryable(e)) throw e;
        parsed.host = alternate;
        return yahooFetchOnce(parsed.toString(), revalidateSeconds, extraHeaders);
    }
};

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
// quoteSummary wraps numbers as { raw, fmt }.
const raw = (value: unknown) => num((value as { raw?: unknown } | undefined)?.raw ?? value);

// --- Session ("crumb") -------------------------------------------------------
// The batch quote and company-summary endpoints need a free anonymous
// session: a cookie from fc.yahoo.com plus a matching "crumb" token. No
// account or key is involved. The pair is cached and refreshed on 401.

declare global {
    var yahooSession: { cookie: string; crumb: string; createdAt: number } | undefined;
}

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

const getSession = async (forceRefresh = false) => {
    const cached = global.yahooSession;
    if (!forceRefresh && cached && Date.now() - cached.createdAt < SESSION_TTL_MS) return cached;

    const cookieRes = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store', redirect: 'manual' });
    const cookie = cookieRes.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    if (!cookie) throw new Error('Yahoo Finance session cookie unavailable');

    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: { 'User-Agent': USER_AGENT, Cookie: cookie },
        cache: 'no-store',
    });
    const crumb = (await crumbRes.text()).trim();
    if (!crumbRes.ok || !crumb || crumb.includes('<')) throw new Error('Yahoo Finance crumb unavailable');

    global.yahooSession = { cookie, crumb, createdAt: Date.now() };
    return global.yahooSession;
};

const fetchWithSession = async (buildUrl: (crumb: string) => string, revalidateSeconds: number) => {
    let session = await getSession();
    try {
        return await yahooFetch(buildUrl(session.crumb), revalidateSeconds, { Cookie: session.cookie });
    } catch (e) {
        if ((e as { status?: number }).status !== 401 && (e as { status?: number }).status !== 403) throw e;
        session = await getSession(true);
        return yahooFetch(buildUrl(session.crumb), revalidateSeconds, { Cookie: session.cookie });
    }
};

// --- Quotes ------------------------------------------------------------------

const fetchChartQuote = async (symbol: string): Promise<YahooQuote | null> => {
    const data = await yahooFetch(`${CHART_URL}/${encodeURIComponent(symbol)}?range=1d&interval=1d`, 30);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.symbol) return null;

    const price = num(meta.regularMarketPrice);
    const previousClose = num(meta.chartPreviousClose) ?? num(meta.previousClose);

    return {
        symbol: meta.symbol,
        name: meta.longName ?? meta.shortName ?? meta.symbol,
        exchange: meta.fullExchangeName ?? meta.exchangeName ?? '',
        currency: meta.currency ?? 'USD',
        quoteType: meta.instrumentType ?? 'EQUITY',
        price,
        previousClose,
        changePercent: price !== undefined && previousClose ? ((price - previousClose) / previousClose) * 100 : undefined,
        dayHigh: num(meta.regularMarketDayHigh),
        dayLow: num(meta.regularMarketDayLow),
        yearHigh: num(meta.fiftyTwoWeekHigh),
        yearLow: num(meta.fiftyTwoWeekLow),
        volume: num(meta.regularMarketVolume),
        marketTime: num(meta.regularMarketTime),
    };
};

// Up to ~50 symbols in one request, including market cap and P/E. Falls
// back to one chart request per symbol if the batch endpoint is unavailable.
export const fetchYahooQuotes = async (symbols: string[]): Promise<YahooQuote[]> => {
    const unique = [...new Set(symbols)];
    if (unique.length === 0) return [];

    try {
        const results: YahooQuote[] = [];
        for (let i = 0; i < unique.length; i += 50) {
            const chunk = unique.slice(i, i + 50).map(encodeURIComponent).join(',');
            const data = await fetchWithSession((crumb) => `${QUOTE_URL}?symbols=${chunk}&crumb=${encodeURIComponent(crumb)}`, 30);

            for (const q of (data?.quoteResponse?.result ?? []) as Record<string, unknown>[]) {
                if (typeof q.symbol !== 'string' || num(q.regularMarketPrice) === undefined) continue;
                results.push({
                    symbol: q.symbol,
                    name: (q.longName ?? q.shortName ?? q.symbol) as string,
                    exchange: (q.fullExchangeName ?? q.exchange ?? '') as string,
                    currency: (q.currency ?? 'USD') as string,
                    quoteType: (q.quoteType ?? 'EQUITY') as string,
                    price: num(q.regularMarketPrice),
                    previousClose: num(q.regularMarketPreviousClose),
                    changePercent: num(q.regularMarketChangePercent),
                    dayHigh: num(q.regularMarketDayHigh),
                    dayLow: num(q.regularMarketDayLow),
                    yearHigh: num(q.fiftyTwoWeekHigh),
                    yearLow: num(q.fiftyTwoWeekLow),
                    volume: num(q.regularMarketVolume),
                    marketCap: num(q.marketCap),
                    peRatio: num(q.trailingPE),
                    marketTime: num(q.regularMarketTime),
                });
            }
        }
        return results;
    } catch (e) {
        unstable_rethrow(e);
        console.error('[yahoo] batch quotes unavailable, falling back to per-symbol requests', e);
        const settled = await Promise.allSettled(unique.map(fetchChartQuote));
        return settled.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
    }
};

// --- History -----------------------------------------------------------------

export const CHART_RANGES = {
    '1D': { range: '1d', interval: '5m', revalidate: 60 },
    '5D': { range: '5d', interval: '15m', revalidate: 300 },
    '1M': { range: '1mo', interval: '1d', revalidate: 900 },
    '6M': { range: '6mo', interval: '1d', revalidate: 1800 },
    '1Y': { range: '1y', interval: '1d', revalidate: 1800 },
    '5Y': { range: '5y', interval: '1wk', revalidate: 3600 },
} as const;

export type ChartRange = keyof typeof CHART_RANGES;

export const fetchYahooHistory = async (symbol: string, rangeKey: ChartRange) => {
    const { range, interval, revalidate } = CHART_RANGES[rangeKey];
    const data = await yahooFetch(`${CHART_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`, revalidate);
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const q = result.indicators?.quote?.[0] ?? {};
    const timestamps: number[] = result.timestamp ?? [];
    const candles: YahooCandle[] = [];

    timestamps.forEach((t, i) => {
        const o = num(q.open?.[i]);
        const h = num(q.high?.[i]);
        const l = num(q.low?.[i]);
        const c = num(q.close?.[i]);
        // Yahoo pads gaps with nulls; skip incomplete bars.
        if (o === undefined || h === undefined || l === undefined || c === undefined) return;
        candles.push({ t, o, h, l, c, v: num(q.volume?.[i]) ?? 0 });
    });

    return {
        currency: (result.meta?.currency ?? 'USD') as string,
        previousClose: num(result.meta?.chartPreviousClose),
        timezone: (result.meta?.exchangeTimezoneName ?? 'UTC') as string,
        candles,
    };
};

// Monthly bars for SIP backtests (split-adjusted; the current month's bar
// is partial). History barely changes, so it's cached for hours.
export const fetchYahooMonthly = async (symbol: string, years: number) => {
    const data = await yahooFetch(`${CHART_URL}/${encodeURIComponent(symbol)}?range=${years}y&interval=1mo`, 6 * 3600);
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const q = result.indicators?.quote?.[0] ?? {};
    const bars: { t: number; o: number; c: number }[] = [];
    (result.timestamp ?? []).forEach((t: number, i: number) => {
        const o = num(q.open?.[i]);
        const c = num(q.close?.[i]);
        if (o !== undefined && c !== undefined) bars.push({ t, o, c });
    });
    return { currency: (result.meta?.currency ?? 'USD') as string, timezone: (result.meta?.exchangeTimezoneName ?? 'UTC') as string, bars };
};

// --- Company summary -----------------------------------------------------------

export const fetchYahooSummary = async (symbol: string) => {
    const modules = 'assetProfile,summaryDetail,financialData,defaultKeyStatistics,incomeStatementHistory,price';
    const data = await fetchWithSession(
        (crumb) => `${SUMMARY_URL}/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`,
        3600
    );
    const r = data?.quoteSummary?.result?.[0];
    if (!r) return null;

    const profile = r.assetProfile ?? {};
    const detail = r.summaryDetail ?? {};
    const fin = r.financialData ?? {};
    const stats = r.defaultKeyStatistics ?? {};

    return {
        profile: {
            sector: profile.sectorDisp ?? profile.sector,
            industry: profile.industryDisp ?? profile.industry,
            employees: num(profile.fullTimeEmployees),
            website: typeof profile.website === 'string' ? profile.website : undefined,
            city: profile.city,
            country: profile.country,
            summary: typeof profile.longBusinessSummary === 'string' ? profile.longBusinessSummary : undefined,
        },
        // Currency amounts below are in `financialCurrency` (reporting
        // currency), except those marked as trading-currency.
        financialCurrency: (fin.financialCurrency ?? r.price?.currency ?? 'USD') as string,
        tradingCurrency: (r.price?.currency ?? detail.currency ?? 'USD') as string,
        metrics: {
            marketCap: raw(detail.marketCap), // trading currency
            trailingPE: raw(detail.trailingPE),
            forwardPE: raw(detail.forwardPE),
            trailingEps: raw(stats.trailingEps), // trading currency
            dividendYield: raw(detail.dividendYield),
            beta: raw(detail.beta),
            profitMargin: raw(fin.profitMargins),
            operatingMargin: raw(fin.operatingMargins),
            returnOnEquity: raw(fin.returnOnEquity),
            revenueGrowth: raw(fin.revenueGrowth),
            debtToEquity: raw(fin.debtToEquity),
            totalRevenue: raw(fin.totalRevenue),
            totalCash: raw(fin.totalCash),
            totalDebt: raw(fin.totalDebt),
            targetMeanPrice: raw(fin.targetMeanPrice), // trading currency
            recommendationKey: typeof fin.recommendationKey === 'string' ? fin.recommendationKey : undefined,
            analystCount: raw(fin.numberOfAnalystOpinions),
        },
        annual: ((r.incomeStatementHistory?.incomeStatementHistory ?? []) as Record<string, unknown>[])
            .map((y) => ({
                year: String((y.endDate as { fmt?: string } | undefined)?.fmt ?? '').slice(0, 4),
                revenue: raw(y.totalRevenue),
                netIncome: raw(y.netIncome),
            }))
            .filter((y) => y.year)
            .reverse(),
    };
};

// --- Search & news -------------------------------------------------------------

export const searchYahoo = async (query: string): Promise<YahooSearchResult[]> => {
    const params = new URLSearchParams({ q: query, quotesCount: '20', newsCount: '0' });
    const data = await yahooFetch(`${SEARCH_URL}?${params}`, 300);

    return ((data?.quotes ?? []) as Record<string, string>[])
        .filter((q) => q.symbol && SEARCHABLE_TYPES.has(q.quoteType))
        .map((q) => ({
            symbol: q.symbol,
            name: q.longname ?? q.shortname ?? q.symbol,
            exchange: q.exchDisp ?? q.exchange ?? '',
            type: q.quoteType === 'ETF' ? 'ETF' : 'Stock',
        }));
};

export const fetchYahooNews = async (query: string, count = 10): Promise<YahooNewsItem[]> => {
    const params = new URLSearchParams({ q: query, quotesCount: '0', newsCount: String(count) });
    const data = await yahooFetch(`${SEARCH_URL}?${params}`, 900);
    return ((data?.news ?? []) as YahooNewsItem[]).filter((n) => n.uuid && n.title && n.link);
};
