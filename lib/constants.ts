export const APP_NAME = 'StockPulse';

export const NAV_ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/search', label: 'Search' },
    { href: '/watchlist', label: 'Watchlist' },
    { href: '/news', label: 'News' },
    { href: '/about', label: 'About' },
];

// Permissive email check: one @, no spaces, a dot in the domain.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-up form select options
export const INVESTMENT_GOALS = [
    { value: 'Growth', label: 'Growth' },
    { value: 'Income', label: 'Income' },
    { value: 'Balanced', label: 'Balanced' },
    { value: 'Conservative', label: 'Conservative' },
];

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
];

export const PREFERRED_INDUSTRIES = [
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Consumer Goods', label: 'Consumer Goods' },
];

export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: 'Price rises above' },
    { value: 'lower', label: 'Price falls below' },
    { value: 'move', label: 'Big daily move (±%)' },
    { value: 'high52', label: 'New 52-week high' },
    { value: 'low52', label: 'New 52-week low' },
    { value: 'volume', label: 'Unusual volume (× average)' },
];

// One-line explanation shown under the condition picker.
export const ALERT_TYPE_HELP: Record<string, string> = {
    upper: 'Fires once when the price reaches your target.',
    lower: 'Fires once when the price drops to your target.',
    move: 'Fires on any trading day the stock moves this much, up or down. Repeats daily.',
    high52: 'Fires on any trading day the stock sets a new 52-week high. Repeats daily.',
    low52: 'Fires on any trading day the stock sets a new 52-week low. Repeats daily.',
    volume: 'Fires on any trading day volume reaches this multiple of its 20-day average. Repeats daily.',
};

// Friendly names for Indian large caps (Yahoo's short names are terse and
// upper-case). Symbols verified against Yahoo Finance.
export const INDIAN_STOCK_NAMES: Record<string, string> = {
    'HDFCBANK.NS': 'HDFC Bank',
    'ICICIBANK.NS': 'ICICI Bank',
    'SBIN.NS': 'State Bank of India',
    'KOTAKBANK.NS': 'Kotak Mahindra Bank',
    'AXISBANK.NS': 'Axis Bank',
    'BAJFINANCE.NS': 'Bajaj Finance',
    'TCS.NS': 'Tata Consultancy Services',
    'INFY.NS': 'Infosys',
    'HCLTECH.NS': 'HCLTech',
    'WIPRO.NS': 'Wipro',
    'TECHM.NS': 'Tech Mahindra',
    'RELIANCE.NS': 'Reliance Industries',
    'ONGC.NS': 'ONGC',
    'NTPC.NS': 'NTPC',
    'POWERGRID.NS': 'Power Grid',
    'COALINDIA.NS': 'Coal India',
    'HINDUNILVR.NS': 'Hindustan Unilever',
    'ITC.NS': 'ITC',
    'NESTLEIND.NS': 'Nestlé India',
    'TITAN.NS': 'Titan',
    'ASIANPAINT.NS': 'Asian Paints',
    'TATACONSUM.NS': 'Tata Consumer',
    'MARUTI.NS': 'Maruti Suzuki',
    'M&M.NS': 'Mahindra & Mahindra',
    'BAJAJ-AUTO.NS': 'Bajaj Auto',
    'EICHERMOT.NS': 'Eicher Motors',
    'HEROMOTOCO.NS': 'Hero MotoCorp',
    'SUNPHARMA.NS': 'Sun Pharma',
    'DRREDDY.NS': "Dr. Reddy's",
    'CIPLA.NS': 'Cipla',
    'APOLLOHOSP.NS': 'Apollo Hospitals',
    'DIVISLAB.NS': "Divi's Laboratories",
    'BHARTIARTL.NS': 'Bharti Airtel',
    'LT.NS': 'Larsen & Toubro',
    'ADANIPORTS.NS': 'Adani Ports',
    'ULTRACEMCO.NS': 'UltraTech Cement',
    'TATASTEEL.NS': 'Tata Steel',
    'JSWSTEEL.NS': 'JSW Steel',
    'HINDALCO.NS': 'Hindalco',
};

const indian = (...symbols: string[]) => symbols.map((symbol) => ({ symbol, name: INDIAN_STOCK_NAMES[symbol] ?? symbol }));

// Dashboard market overview / quotes groups. Indian market first; US
// indices live under "Global".
export const MARKET_GROUPS = [
    {
        title: 'Indices',
        symbols: [
            { symbol: '^NSEI', name: 'Nifty 50' },
            { symbol: '^BSESN', name: 'BSE Sensex' },
            { symbol: '^NSEBANK', name: 'Nifty Bank' },
            { symbol: '^CNXIT', name: 'Nifty IT' },
            { symbol: '^CNXAUTO', name: 'Nifty Auto' },
            { symbol: '^CNXPHARMA', name: 'Nifty Pharma' },
        ],
    },
    { title: 'Banking', symbols: indian('HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'BAJFINANCE.NS') },
    { title: 'IT', symbols: indian('TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS', 'TECHM.NS') },
    { title: 'Consumer', symbols: indian('HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'TITAN.NS', 'ASIANPAINT.NS') },
    {
        title: 'Global',
        symbols: [
            { symbol: '^GSPC', name: 'S&P 500' },
            { symbol: '^IXIC', name: 'Nasdaq Composite' },
            { symbol: '^DJI', name: 'Dow Jones' },
            { symbol: 'AAPL', name: 'Apple' },
            { symbol: 'NVDA', name: 'NVIDIA' },
            { symbol: 'MSFT', name: 'Microsoft' },
        ],
    },
];

// Heatmaps: large caps grouped by sector, sized by market cap. India is the
// default; the US map is one toggle away.
export const HEATMAP_SECTORS = {
    india: [
        { name: 'Banking & Finance', symbols: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'BAJFINANCE.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'] },
        { name: 'IT', symbols: ['TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS', 'TECHM.NS'] },
        { name: 'Energy & Utilities', symbols: ['RELIANCE.NS', 'NTPC.NS', 'ONGC.NS', 'COALINDIA.NS', 'POWERGRID.NS'] },
        { name: 'FMCG & Consumer', symbols: ['HINDUNILVR.NS', 'TITAN.NS', 'ITC.NS', 'NESTLEIND.NS', 'ASIANPAINT.NS', 'TATACONSUM.NS'] },
        { name: 'Auto', symbols: ['MARUTI.NS', 'M&M.NS', 'BAJAJ-AUTO.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS'] },
        { name: 'Pharma & Healthcare', symbols: ['SUNPHARMA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS', 'CIPLA.NS', 'DRREDDY.NS'] },
        { name: 'Telecom, Infra & Metals', symbols: ['BHARTIARTL.NS', 'LT.NS', 'ADANIPORTS.NS', 'ULTRACEMCO.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS', 'HINDALCO.NS'] },
    ],
    us: [
        { name: 'Technology', symbols: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'AMD', 'ADBE'] },
        { name: 'Communication', symbols: ['GOOGL', 'META', 'NFLX', 'DIS', 'T', 'VZ'] },
        { name: 'Consumer', symbols: ['AMZN', 'TSLA', 'WMT', 'COST', 'HD', 'MCD', 'KO', 'PG'] },
        { name: 'Financial', symbols: ['BRK-B', 'JPM', 'V', 'MA', 'BAC', 'GS'] },
        { name: 'Healthcare', symbols: ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE'] },
        { name: 'Energy & Industrial', symbols: ['XOM', 'CVX', 'CAT', 'GE', 'BA', 'UPS'] },
    ],
};

// Default list in the search dialog (before the user types).
export const POPULAR_STOCK_NAMES: Record<string, string> = {
    'RELIANCE.NS': 'Reliance Industries',
    'HDFCBANK.NS': 'HDFC Bank',
    'TCS.NS': 'Tata Consultancy Services',
    'INFY.NS': 'Infosys',
    'ICICIBANK.NS': 'ICICI Bank',
    'BHARTIARTL.NS': 'Bharti Airtel',
    'SBIN.NS': 'State Bank of India',
    'ITC.NS': 'ITC',
    'LT.NS': 'Larsen & Toubro',
    'MARUTI.NS': 'Maruti Suzuki',
    'AAPL': 'Apple Inc',
    'NVDA': 'NVIDIA Corporation',
};
