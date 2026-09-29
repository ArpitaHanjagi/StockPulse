import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
    Bell,
    BarChart3,
    Clock,
    Gauge,
    GitCompareArrows,
    IndianRupee,
    LayoutGrid,
    Newspaper,
    Star,
} from "lucide-react";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/better-auth/session";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
    title: `About · ${APP_NAME}`,
    description: "What StockPulse is, what it can do, and where its data comes from.",
};

const FEATURES = [
    { icon: IndianRupee, title: "Prices in rupees", text: "US and Indian stocks side by side, with every price converted to INR so you can compare at a glance." },
    { icon: Star, title: "Watchlist", text: "Save the stocks you care about and see their live price, daily change and trend in one table." },
    { icon: Bell, title: "Price alerts", text: "Pick a price above or below the current one. When it's crossed you get an in-app notification and, if you allow it, a desktop one." },
    { icon: LayoutGrid, title: "Sector heatmap", text: "See which parts of the market are up or down today, sized and coloured by the move." },
    { icon: BarChart3, title: "Charts & financials", text: "Interactive price charts from one day to five years, plus company profile, key ratios and annual results." },
    { icon: GitCompareArrows, title: "Compare stocks", text: "Plot several stocks on one chart to see which performed better over the same period." },
    { icon: Gauge, title: "Technical ratings", text: "A quick buy/sell read from common indicators like moving averages and RSI." },
    { icon: Newspaper, title: "Market news", text: "Top stories for the market and for each stock you open." },
    { icon: Clock, title: "Market hours", text: "Whether NYSE and NSE are open right now, and how long until that changes." },
];

const STEPS = [
    { title: "Create a free account", text: "Tell us your goals and preferred industry, and your dashboard suggests stocks to start with." },
    { title: "Build your watchlist", text: "Search any stock by name or symbol and star it." },
    { title: "Set alerts and relax", text: "StockPulse keeps an eye on prices and tells you when something you care about moves." },
];

const SOURCES = [
    { name: "Yahoo Finance", text: "stock prices, charts, company data and news" },
    { name: "Frankfurter", text: "currency exchange rates for INR conversion" },
];

const AboutPage = async () => {
    const user = await getCurrentUser();

    return (
        <main className="min-h-screen bg-gray-900 text-gray-400">
            <header className="border-b border-gray-700">
                <div className="container flex h-16 items-center justify-between gap-4">
                    <Link href={user ? "/" : "/sign-in"} aria-label={user ? "Go to dashboard" : "Go to sign in"}>
                        <Logo />
                    </Link>
                    <Link href={user ? "/" : "/sign-in"} className="text-sm font-medium text-gray-300 hover:text-yellow-500">
                        {user ? "Back to dashboard" : "Sign in"}
                    </Link>
                </div>
            </header>

            <div className="container space-y-20 py-12 sm:py-16">
                <section className="grid items-center gap-10 lg:grid-cols-2">
                    <div className="space-y-6">
                        <p className="text-sm font-medium uppercase tracking-wider text-yellow-500">About {APP_NAME}</p>
                        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
                            Keep a pulse on the stocks that matter to you.
                        </h1>
                        <p className="text-lg leading-relaxed">
                            {APP_NAME} is a free stock tracker for everyday investors. Follow US and Indian markets in rupees,
                            build a watchlist, and get alerted when prices hit your targets — without paying for a data plan.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {user ? (
                                <Link href="/" className="yellow-btn inline-flex items-center px-6">Open your dashboard</Link>
                            ) : (
                                <>
                                    <Link href="/sign-up" className="yellow-btn inline-flex items-center px-6">Create free account</Link>
                                    <Link href="/sign-in" className="inline-flex h-12 items-center rounded-lg border border-gray-600 px-6 font-medium text-gray-200 hover:border-gray-500 hover:bg-gray-800">
                                        Sign in
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <Image
                        src="/assets/images/stockpulse-dashboard.png"
                        alt="StockPulse dashboard: watchlist, market overview chart and sector heatmap"
                        width={1440}
                        height={1150}
                        className="w-full rounded-xl border border-gray-700 shadow-2xl"
                        priority
                    />
                </section>

                <section className="space-y-8">
                    <h2 className="text-2xl font-semibold text-gray-100 sm:text-3xl">What you can do</h2>
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
                                <Icon className="mb-3 size-6 text-yellow-500" aria-hidden />
                                <h3 className="mb-1 font-semibold text-gray-100">{title}</h3>
                                <p className="text-sm leading-relaxed">{text}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-8">
                    <h2 className="text-2xl font-semibold text-gray-100 sm:text-3xl">How it works</h2>
                    <ol className="grid gap-4 md:grid-cols-3">
                        {STEPS.map(({ title, text }, i) => (
                            <li key={title} className="flex gap-4">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow-500 font-bold text-gray-900">
                                    {i + 1}
                                </span>
                                <div>
                                    <h3 className="mb-1 font-semibold text-gray-100">{title}</h3>
                                    <p className="text-sm leading-relaxed">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
                        <h2 className="mb-3 text-xl font-semibold text-gray-100">Where the data comes from</h2>
                        <ul className="space-y-2 text-sm">
                            {SOURCES.map(({ name, text }) => (
                                <li key={name}>
                                    <span className="font-medium text-gray-200">{name}</span> — {text}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-sm">
                            Prices can be delayed by a few minutes depending on the exchange, so double-check with your broker before trading.
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
                        <h2 className="mb-3 text-xl font-semibold text-gray-100">Good to know</h2>
                        <p className="text-sm leading-relaxed">
                            {APP_NAME} is for tracking and learning, not financial advice. Nothing here is a recommendation to buy or
                            sell. Your account holds only your profile, watchlist and alerts — we never ask for brokerage or bank details.
                        </p>
                    </div>
                </section>
            </div>

            <footer className="border-t border-gray-700">
                <div className="container flex flex-col gap-2 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>© {new Date().getFullYear()} {APP_NAME}</span>
                    <span>Built for everyday investors · For information only, not financial advice</span>
                </div>
            </footer>
        </main>
    );
};

export default AboutPage;
