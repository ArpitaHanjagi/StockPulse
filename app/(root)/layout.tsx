import Header from "@/components/Header";
import AlertNotifier from "@/components/AlertNotifier";
import MobileNav from "@/components/MobileNav";
import MotionProvider from "@/components/MotionProvider";
import MarketStatus from "@/components/MarketStatus";
import { searchStocks } from "@/lib/actions/market.actions";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/better-auth/session";


const Layout=async ({children}:{children : React.ReactNode})  =>{
    // The proxy only checks that a session cookie exists; make sure it's valid.
    if (!(await getCurrentUser())) redirect("/sign-in");
    const initialStocks = await searchStocks();

    return(
        <MotionProvider>
        <main className="min-h-screen text-gray-400">
            <Header/>
            <AlertNotifier/>
        <div className="container py-6 pb-24 sm:py-10 sm:pb-10">
            {/* On phones the header has no room for market hours, so show them here */}
            <MarketStatus className="mb-4 xl:hidden"/>
            {children}
        </div>
            <MobileNav initialStocks={initialStocks}/>
        </main>
        </MotionProvider>
    )
}
export default Layout
