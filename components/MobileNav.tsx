'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Info, LayoutDashboard, Newspaper, Search, Star } from 'lucide-react';
import SearchCommand from '@/components/SearchCommand';
import { cn } from '@/lib/utils';

const ITEMS = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/watchlist', label: 'Watchlist', icon: Star },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/about', label: 'About', icon: Info },
];

const itemClass = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors';

// Bottom tab bar for phones (hidden from `sm` up, where the header nav shows).
const MobileNav = ({ initialStocks }: { initialStocks: StockWithWatchlistStatus[] }) => {
    const pathname = usePathname();
    const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

    return (
        <nav
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-700 bg-gray-800/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        >
            {ITEMS.slice(0, 1).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={cn(itemClass, isActive(href) ? 'text-yellow-500' : 'text-gray-400')} aria-current={isActive(href) ? 'page' : undefined}>
                    <Icon className="size-5" />
                    {label}
                </Link>
            ))}
            <SearchCommand
                initialStocks={initialStocks}
                label="Search stocks"
                shortcut={false}
                triggerClassName={cn(itemClass, 'text-gray-400')}
                triggerContent={
                    <>
                        <Search className="size-5" />
                        Search
                    </>
                }
            />
            {ITEMS.slice(1).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={cn(itemClass, isActive(href) ? 'text-yellow-500' : 'text-gray-400')} aria-current={isActive(href) ? 'page' : undefined}>
                    <Icon className="size-5" />
                    {label}
                </Link>
            ))}
        </nav>
    );
};

export default MobileNav;
