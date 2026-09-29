declare global {
    type SignInFormData = {
        email: string;
        password: string;
    };

    type SignUpFormData = {
        fullName: string;
        email: string;
        password: string;
        country: string;
        investmentGoals: string;
        riskTolerance: string;
        preferredIndustry: string;
    };

    type ProfileFormData = Omit<SignUpFormData, 'email' | 'password'>;

    type ChangePasswordFormData = {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
        revokeOtherSessions: boolean;
    };

    type CountrySelectProps = {
        name: string;
        label: string;
        control: Control;
        error?: FieldError;
        required?: boolean;
    };

    type FormInputProps = {
        name: string;
        label: string;
        placeholder: string;
        type?: string;
        register: UseFormRegister;
        error?: FieldError;
        validation?: RegisterOptions;
        disabled?: boolean;
        value?: string;
    };

    type Option = {
        value: string;
        label: string;
    };

    type SelectFieldProps = {
        name: string;
        label: string;
        placeholder: string;
        options: readonly Option[];
        control: Control;
        error?: FieldError;
        required?: boolean;
    };

    type FooterLinkProps = {
        text: string;
        linkText: string;
        href: string;
    };

    type SearchCommandProps = {
        renderAs?: 'button' | 'text';
        label?: string;
        initialStocks: StockWithWatchlistStatus[];
        // Whether this instance listens for Ctrl/⌘+K (only one should).
        shortcut?: boolean;
        triggerClassName?: string;
        triggerContent?: import('react').ReactNode;
    };

    type User = {
        id: string;
        name: string;
        email: string;
    };

    type Stock = {
        symbol: string;
        name: string;
        exchange: string;
        type: string;
    };

    type StockWithWatchlistStatus = Stock & {
        isInWatchlist: boolean;
    };

    type StockDetailsPageProps = {
        params: Promise<{
            symbol: string;
        }>;
    };

    type WatchlistButtonProps = {
        symbol: string;
        company: string;
        isInWatchlist: boolean;
        showTrashIcon?: boolean;
        type?: 'button' | 'icon';
        onWatchlistChange?: (symbol: string, isAdded: boolean) => void;
    };

    type SelectedStock = {
        symbol: string;
        company: string;
        currentPrice?: number;
    };

    type WatchlistTableProps = {
        watchlist: StockWithData[];
        // 1-month closing prices per symbol, for sparklines.
        sparklines?: Record<string, number[]>;
    };

    type StockWithData = {
        symbol: string;
        company: string;
        addedAt?: string;
        currentPrice?: number;
        changePercent?: number;
        priceFormatted?: string;
        changeFormatted?: string;
        yearRange?: string;
        volume?: string;
        marketCap?: string;
        peRatio?: string;
        // Raw values, for sorting.
        marketCapValue?: number;
        peRatioValue?: number;
        volumeValue?: number;
    };

    // Live quote with every price field already converted to INR.
    type StockQuote = {
        symbol: string;
        name: string;
        exchange: string;
        currency: string;
        // Index levels are points, not money: never converted or shown as ₹.
        isIndex?: boolean;
        inrRate?: number;
        price?: number;
        change?: number;
        changePercent?: number;
        previousClose?: number;
        dayHigh?: number;
        dayLow?: number;
        yearHigh?: number;
        yearLow?: number;
        volume?: number;
        marketCap?: number;
        peRatio?: number;
        // Unix seconds of the latest trade (identifies the trading session).
        marketTime?: number;
    };

    type ChartRangeKey = '1D' | '5D' | '1M' | '6M' | '1Y' | '5Y';

    type PriceCandle = { t: number; o: number; h: number; l: number; c: number; v: number };

    // Listing currency (not INR): historical prices can't be converted with
    // today's exchange rate.
    type PriceHistory = {
        symbol: string;
        range: ChartRangeKey;
        currency: string;
        previousClose?: number;
        timezone: string;
        candles: PriceCandle[];
    };

    // Money values are converted to INR.
    type CompanyOverview = {
        profile: {
            sector?: string;
            industry?: string;
            employees?: number;
            website?: string;
            city?: string;
            country?: string;
            summary?: string;
        };
        financialCurrency: string;
        metrics: {
            marketCap?: number;
            trailingPE?: number;
            forwardPE?: number;
            trailingEps?: number;
            dividendYield?: number;
            beta?: number;
            profitMargin?: number;
            operatingMargin?: number;
            returnOnEquity?: number;
            revenueGrowth?: number;
            debtToEquity?: number;
            totalRevenue?: number;
            totalCash?: number;
            totalDebt?: number;
            targetMeanPrice?: number;
            recommendationKey?: string;
            analystCount?: number;
        };
        annual: { year: string; revenue?: number; netIncome?: number }[];
    };

    // "Why is it moving?" — see lib/market/explain.ts.
    type MoveReport = {
        driver: 'flat' | 'market' | 'sector' | 'stock';
        direction: 'up' | 'down' | 'flat';
        headline: string;
        points: string[];
        headlines: MarketNewsArticle[];
        sessionOpen: boolean;
    };

    // SIP backtest result — see lib/market/sip.ts. Money values in INR.
    type SipResult = {
        symbol: string;
        name: string;
        monthly: number;
        years: number;
        months: number;
        startDate: number;
        benchmarkLabel: string;
        fdRate: number;
        points: { t: number; invested: number; stock: number; benchmark?: number; fd: number }[];
        summary: {
            invested: number;
            stock: { value: number; xirr?: number };
            benchmark?: { value: number; xirr?: number };
            fd: { value: number; xirr?: number };
        };
        // e.g. "USD/INR moved from 73.07 to 95.98" for foreign listings.
        fxNote?: string;
        shortHistory: boolean;
    };

    type HeatmapMarket = 'india' | 'us';
    type HeatmapSector = { name: string; items: { symbol: string; quote: StockQuote | null }[] };

    type MarketBoard = {
        groups: { title: string; items: { symbol: string; name: string; quote: StockQuote | null }[] }[];
        sectors: Record<HeatmapMarket, HeatmapSector[]>;
    };

    type AlertsListProps = {
        alertData: Alert[] | undefined;
    };

    type MarketNewsArticle = {
        id: string;
        headline: string;
        source: string;
        url: string;
        datetime: number;
        related: string;
        image?: string;
    };

    type WatchlistNewsProps = {
        news?: MarketNewsArticle[];
        emptyMessage?: string;
    };

    // 'upper'/'lower': one-shot price targets. The rest are recurring
    // "smart" alerts that fire at most once per trading session.
    type AlertType = 'upper' | 'lower' | 'move' | 'high52' | 'low52' | 'volume';

    type AlertData = {
        symbol: string;
        company: string;
        alertName: string;
        alertType: AlertType;
        threshold: string;
    };

    type AlertModalProps = {
        alertId?: string;
        alertData?: AlertData;
        action?: string;
        open: boolean;
        setOpen: (open: boolean) => void;
    };

    type Alert = {
        id: string;
        symbol: string;
        company: string;
        alertName: string;
        currentPrice?: number;
        alertType: AlertType;
        threshold: number;
        changePercent?: number;
        triggered: boolean;
        triggeredAt?: string;
        triggeredPrice?: number;
        // Smart alerts repeat; `firedToday` = already fired this session.
        recurring: boolean;
        firedToday?: boolean;
        // Created while its condition was already true: starts next session.
        startsNextSession?: boolean;
        // Set on alerts returned when they fire.
        title?: string;
        message?: string;
    };

    type AppNotification = {
        id: string;
        type: 'welcome' | 'alert' | 'system';
        title: string;
        message: string;
        link?: string;
        read: boolean;
        createdAt: string;
    };
}

export {};