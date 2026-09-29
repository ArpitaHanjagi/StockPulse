// Picks the benchmark a stock's move is compared against: its home market's
// main index, plus a sector benchmark matched from Yahoo's sector/industry
// labels (Nifty sector indices for Indian stocks, SPDR sector ETFs for US
// stocks). All symbols verified against Yahoo Finance.

export type BenchmarkRef = { symbol: string; label: string };

export const marketBenchmark = (indian: boolean): BenchmarkRef =>
    indian ? { symbol: '^NSEI', label: 'Nifty 50' } : { symbol: '^GSPC', label: 'S&P 500' };

const IN = {
    bank: { symbol: '^NSEBANK', label: 'Nifty Bank' },
    finance: { symbol: 'NIFTY_FIN_SERVICE.NS', label: 'Nifty Financial Services' },
    it: { symbol: '^CNXIT', label: 'Nifty IT' },
    auto: { symbol: '^CNXAUTO', label: 'Nifty Auto' },
    pharma: { symbol: '^CNXPHARMA', label: 'Nifty Pharma' },
    fmcg: { symbol: '^CNXFMCG', label: 'Nifty FMCG' },
    consumption: { symbol: '^CNXCONSUM', label: 'Nifty Consumption' },
    energy: { symbol: '^CNXENERGY', label: 'Nifty Energy' },
    metal: { symbol: '^CNXMETAL', label: 'Nifty Metal' },
    infra: { symbol: '^CNXINFRA', label: 'Nifty Infra' },
    realty: { symbol: '^CNXREALTY', label: 'Nifty Realty' },
    media: { symbol: '^CNXMEDIA', label: 'Nifty Media' },
} satisfies Record<string, BenchmarkRef>;

const US: Record<string, BenchmarkRef> = {
    Technology: { symbol: 'XLK', label: 'US Tech sector (XLK)' },
    'Financial Services': { symbol: 'XLF', label: 'US Financials (XLF)' },
    Energy: { symbol: 'XLE', label: 'US Energy (XLE)' },
    Healthcare: { symbol: 'XLV', label: 'US Healthcare (XLV)' },
    'Consumer Cyclical': { symbol: 'XLY', label: 'US Consumer Discretionary (XLY)' },
    'Consumer Defensive': { symbol: 'XLP', label: 'US Consumer Staples (XLP)' },
    'Basic Materials': { symbol: 'XLB', label: 'US Materials (XLB)' },
    Industrials: { symbol: 'XLI', label: 'US Industrials (XLI)' },
    'Communication Services': { symbol: 'XLC', label: 'US Communication (XLC)' },
    Utilities: { symbol: 'XLU', label: 'US Utilities (XLU)' },
    'Real Estate': { symbol: 'XLRE', label: 'US Real Estate (XLRE)' },
};

export const sectorBenchmark = (indian: boolean, sector?: string, industry?: string): BenchmarkRef | undefined => {
    if (!sector) return undefined;
    if (!indian) return US[sector];

    const ind = (industry ?? '').toLowerCase();
    if (ind.includes('bank')) return IN.bank;
    if (ind.includes('auto')) return IN.auto;
    if (/steel|alumin|metal|mining|copper|zinc/.test(ind)) return IN.metal;
    if (/telecom/.test(ind)) return IN.infra;

    switch (sector) {
        case 'Financial Services':
            return IN.finance;
        case 'Technology':
            return IN.it;
        case 'Healthcare':
            return IN.pharma;
        case 'Consumer Defensive':
            return IN.fmcg;
        case 'Consumer Cyclical':
            return IN.consumption;
        case 'Energy':
        case 'Utilities':
            return IN.energy;
        case 'Basic Materials':
        case 'Industrials':
            return IN.infra;
        case 'Real Estate':
            return IN.realty;
        case 'Communication Services':
            return ind.includes('entertainment') || ind.includes('broadcast') ? IN.media : IN.infra;
        default:
            return undefined;
    }
};
