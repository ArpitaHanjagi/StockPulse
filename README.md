# StockPulse

Track stock prices in INR, build a watchlist, set price alerts and follow market news — with **no paid API keys**.

## Features

- **Smart alerts** — besides price targets: big daily moves (±X%), new 52-week highs/lows and unusual volume (X× the 20-day average). They fire at most once per trading session and re-arm automatically.
- **SIP backtest** — on every stock page: what a monthly SIP would be worth today versus the same SIP in Nifty 50 / S&P 500 and a 7% FD, with XIRR. US stocks convert each instalment at that month's USD/INR rate.
- **Why is it moving?** — a rule-based explanation of each stock's latest move (market-wide, sector-wide or company-specific), with volume, gaps, 52-week extremes and related headlines.
- **India-first** — the dashboard, heatmap, market overview, suggestions, search defaults and news lead with the Indian market (NSE stocks, Nifty 50, Sensex, sector indices), with US markets one click away. NSE tickers are shown without Yahoo's `.NS` suffix.
- **Live quotes in INR** — prices from Yahoo Finance, converted from the listing currency with live rates from frankfurter.dev.
- **Search** (`Ctrl/⌘ + K`) — US, Indian (`.NS` / `.BO`) and other listed stocks and ETFs, with recent searches.
- **Watchlist** — price, daily change, 52-week range and volume.
- **Price alerts** — "rises above" / "falls below" alerts, checked automatically every minute while the app is open (and whenever you return to the tab). Each alert fires exactly once and stays in your list as history; edit it to re-arm.
- **Notifications** — a header notification centre, an alert sound, and optional desktop notifications. Replaces the old emails.
- **Personalised onboarding** — a welcome notification and dashboard suggestions based on the industry and goals chosen at sign-up.
- **News** — headlines for your watchlist stocks plus general market news, and per-stock news on each stock page.
- **Charts, built in** — candlestick / line / baseline price charts (1D–5Y) with SMA 20/50 and volume, a sector heatmap sized by market cap, market overview & quote tables, a technical-analysis rating (RSI, MACD, stochastic, CCI, moving averages…), company profile and financials. All drawn by the app itself from free data — no third-party chart service.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and fill it in:

   ```bash
   cp .env.example .env
   ```

   Only two things are needed:
   - **Firebase service account** — create a Firebase project (the free Spark plan is enough), enable **Firestore Database** (Build → Firestore Database → Create database), then go to Project settings → Service accounts → *Generate new private key*. Save the file in the project root as `firebase-service-account.json` (it's git-ignored).
   - **`BETTER_AUTH_SECRET`** — any long random string.

3. Check the database connection (optional):

   ```bash
   npm run test:db
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and create an account.

## Data sources

| Data | Source | Key needed |
|---|---|---|
| Quotes, search, news | Yahoo Finance public endpoints | No |
| USD→INR (and other) rates | [frankfurter.dev](https://frankfurter.dev) | No |
| Price history, company profile & financials | Yahoo Finance public endpoints | No |
| Users, watchlists, alerts, notifications | Cloud Firestore (Firebase free tier) | Service account only |

Yahoo Finance's endpoints are unofficial. They are widely used but can change without notice; all calls live in [`lib/market/yahoo.ts`](lib/market/yahoo.ts), so switching providers only touches that file.

## Project layout

- `app/(auth)` — sign-in / sign-up
- `app/(root)` — dashboard, stock pages, watchlist, news
- `lib/actions` — server actions (market data, watchlist, alerts, notifications, auth)
- `lib/market` — Yahoo Finance client, technical indicators, chart colours, formatting
- `components/charts`, `components/stock`, `components/dashboard` — the built-in charts and panels
- `DATABASE/firebase.ts` — Firestore connection
- `lib/better-auth/firestore-adapter.ts` — stores login data (users, sessions) in Firestore
- `components` — UI (`AlertNotifier` runs the alert checks, `NotificationBell` is the notification centre)
