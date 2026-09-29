'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Bell, KeyRound, LogOut, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { signOutUser } from "@/lib/actions/auth.actions";

const MENU_LINKS = [
    { href: "/profile", label: "My Profile", icon: UserRound },
    { href: "/watchlist", label: "Watchlist", icon: Star },
    { href: "/watchlist", label: "Price Alerts", icon: Bell },
    { href: "/profile#security", label: "Change Password", icon: KeyRound },
];

const itemClass = "text-gray-100 text-md font-medium focus:bg-transparent focus:text-yellow-500 transition-colors cursor-pointer";

const UserDropdown = ({ user }: { user?: { name: string; email: string; image?: string | null } }) => {
    const router = useRouter();

    const displayName = user?.name ?? "Trader";
    const displayEmail = user?.email ?? "";

    const handleSignOut = async () => {
        const result = await signOutUser();

        if (!result.success) {
            toast.error("Sign out failed", { description: result.error });
            return;
        }

        router.push("/sign-in");
        router.refresh();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 text-gray-400 hover:text-yellow-500">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image ?? undefined} />
                    <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                        {displayName[0]}
                    </AvatarFallback>
                </Avatar>

                <div className="hidden xl:flex flex-col items-start">
                    <span className="text-base font-medium text-gray-400">
                        {displayName}
                    </span>
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="text-gray-400">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        <div className="flex relative items-center gap-3 py-2">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user?.image ?? undefined} />
                                <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                                    {displayName[0]}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex flex-col">
                                <span className="text-base font-medium text-gray-400">
                                    {displayName}
                                </span>

                                <span className="text-sm text-gray-500">
                                    {displayEmail}
                                </span>
                            </div>
                        </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-gray-600" />

                    {MENU_LINKS.map(({ href, label, icon: Icon }) => (
                        <DropdownMenuItem key={label} onClick={() => router.push(href)} className={itemClass}>
                            <Icon className="h-4 w-4 mr-2" />
                            {label}
                        </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="bg-gray-600" />

                    <DropdownMenuItem onClick={handleSignOut} className={itemClass}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </DropdownMenuItem>

                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserDropdown;