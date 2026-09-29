import Link from "next/link";
import Logo from "@/components/Logo";
import NavItems from "./NavItems";
import UserDropDown from "@/components/UserDropDown";
import NotificationBell from "@/components/NotificationBell";
import MarketStatus from "@/components/MarketStatus";
import { getCurrentUser } from "@/lib/better-auth/session";
import { searchStocks } from "@/lib/actions/market.actions";

const Header = async () => {
    const [user, initialStocks] = await Promise.all([getCurrentUser(), searchStocks()]);

    return(
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
            <Link href="/about" aria-label="About StockPulse">
                <Logo/>
            </Link>
                <nav className="hidden sm:block">
                    <NavItems initialStocks={initialStocks}/>
                </nav>
                <div className="flex items-center gap-3">
                    <MarketStatus className="hidden xl:flex"/>
                    <NotificationBell/>
                    <UserDropDown user={user ?? undefined}/>
                </div>
            </div>
        </header>
    )
}
export default Header;
