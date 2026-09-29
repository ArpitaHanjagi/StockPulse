import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";

const FEATURES = ["Live INR prices", "Price alerts", "Sector heatmap", "Compare stocks", "Technical ratings", "Market news"];

const Layout=({children}:{children : React.ReactNode})  =>{
    return(
        <main className="auth-layout">
         <section className="auth-left-section scrollbar-hide-default">
         <Link href="/about" className="auth-logo" aria-label="About StockPulse">
             <Logo/>
         </Link>

             <div className="pb-6 lg:pb-8 flex-1">
                 {children}
             </div>
         </section>
            <section className="auth-right-section">
                <div className="z-10 relative lg:mt-4 lg:mb-16">
                  <blockquote className="auth-blockquote">
                      StockPulse turned my watchlist into a winning list. The alerts are spot-on, and I feel more confident making moves in the market
                  </blockquote>
                    <div className="flex items-center justify-between ">
                        <div>
                       <cite className="auth-testimonial-author">- Ethan R.</cite>
                        <p className="max-md:text-xs text-gray-500">Retail Investor</p>
                    </div>
                        <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map((star)=>(
                                <Image key={star} src="/assets/icons/star.svg" alt="Star" width={20}  height={32} className="h-5 w-5"/>
                            ))}

                        </div>
                    </div>

                </div>

                <ul className="relative z-10 mt-6 flex flex-wrap gap-2 lg:mt-0 lg:mb-8" aria-label="What you get">
                    {FEATURES.map((f)=>(
                        <li key={f} className="rounded-full border border-gray-600 bg-gray-900/60 px-3 py-1 text-xs text-gray-400">{f}</li>
                    ))}
                </ul>

                {/* Phones & tablets: a compact phone screenshot */}
                <div className="mt-8 flex justify-center lg:hidden">
                    <Image src="/assets/images/stockpulse-dashboard-mobile.png" alt="StockPulse dashboard on a phone: watchlist cards, market status and charts" width={780} height={1688} className="h-auto w-56 rounded-2xl border-4 border-gray-700 shadow-2xl sm:w-64"/>
                </div>

                {/* Desktop: the full dashboard */}
                <div className="flex-1 relative">
                    <Image src="/assets/images/stockpulse-dashboard.png" alt="StockPulse dashboard: watchlist, market overview chart and sector heatmap" width={1440} height={1150} className="auth-dashboard-preview absolute top-0" priority/>
                </div>

            </section>

        </main>
    )
}
export default Layout