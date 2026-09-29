import Image from "next/image";
import { cn } from "@/lib/utils";

// Brand mark (chart icon) + wordmark rendered as text in the app font.
const Logo = ({ className }: { className?: string }) => (
    <span className={cn("flex items-center gap-2", className)}>
        <Image src="/assets/icons/logo-mark.svg" alt="" width={28} height={30} className="h-7 w-auto" priority />
        <span className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Stock<span className="text-yellow-500">Pulse</span>
        </span>
    </span>
);

export default Logo;
