import { INDIAN_STOCK_NAMES } from '@/lib/constants';

// Yahoo suffixes Indian listings (.NS = NSE, .BO = BSE). Users know them
// by the bare ticker, so strip the suffix for display; URLs and data keep
// the full symbol.
export const displaySymbol = (symbol: string) => symbol.replace(/\.(NS|BO)$/i, '');

export const isIndianSymbol = (symbol: string) => /\.(NS|BO)$/i.test(symbol) || ['^NSEI', '^BSESN', '^NSEBANK'].includes(symbol);

// Well-known Indian large caps per industry, used to suggest stocks to new
// users based on the preferred industry they picked at sign-up.
export const INDUSTRY_PICKS: Record<string, string[]> = {
    Technology: ['TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS'],
    Healthcare: ['SUNPHARMA.NS', 'DIVISLAB.NS', 'CIPLA.NS', 'APOLLOHOSP.NS'],
    Finance: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'BAJFINANCE.NS'],
    Energy: ['RELIANCE.NS', 'NTPC.NS', 'ONGC.NS', 'POWERGRID.NS'],
    'Consumer Goods': ['HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'TITAN.NS'],
};

export const getIndustryPicks = (industry?: string | null) =>
    INDUSTRY_PICKS[industry ?? ''] ?? INDUSTRY_PICKS.Technology;

export const pickName = (symbol: string) => INDIAN_STOCK_NAMES[symbol] ?? displaySymbol(symbol);
