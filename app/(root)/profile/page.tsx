import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProfileForm from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import SessionControls from "@/components/profile/SessionControls";
import { getCurrentUser } from "@/lib/better-auth/session";
import { getWatchlistSymbols } from "@/lib/actions/watchlist.actions";
import { getAlerts } from "@/lib/actions/alert.actions";

const sectionClass = "rounded-lg border border-gray-600 bg-gray-800 p-6 space-y-5";

const ProfilePage = async () => {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const [watchlist, alerts] = await Promise.all([getWatchlistSymbols(), getAlerts()]);
    const activeAlerts = alerts.filter((a) => !a.triggered).length;
    const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const stats = [
        { label: "Watchlist stocks", value: watchlist.length, icon: Star, href: "/watchlist" },
        { label: "Active alerts", value: activeAlerts, icon: Bell, href: "/watchlist" },
    ];

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
            <section className={sectionClass}>
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback className="bg-yellow-500 text-2xl font-bold text-yellow-900">
                            {user.name[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <h1 className="watchlist-title truncate">{user.name}</h1>
                        <p className="truncate text-gray-500">{user.email}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                            <CalendarDays className="h-4 w-4" />
                            Member since {memberSince}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {stats.map(({ label, value, icon: Icon, href }) => (
                        <Link
                            key={label}
                            href={href}
                            className="flex items-center gap-3 rounded-lg bg-gray-700/50 p-4 transition-colors hover:bg-gray-700"
                        >
                            <Icon className="h-5 w-5 text-yellow-500" />
                            <div>
                                <p className="text-xl font-bold text-gray-100">{value}</p>
                                <p className="text-sm text-gray-500">{label}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section id="preferences" className={sectionClass}>
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">Personal details & preferences</h2>
                    <p className="text-sm text-gray-500">These shape your personalised news and recommendations.</p>
                </div>
                <ProfileForm
                    defaultValues={{
                        fullName: user.name,
                        country: user.country ?? "US",
                        investmentGoals: user.investmentGoals ?? "Growth",
                        riskTolerance: user.riskTolerance ?? "Medium",
                        preferredIndustry: user.preferredIndustry ?? "Technology",
                    }}
                />
            </section>

            <section id="security" className={sectionClass}>
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">Change password</h2>
                    <p className="text-sm text-gray-500">Use at least 8 characters.</p>
                </div>
                <ChangePasswordForm />
            </section>

            <section id="sessions" className={sectionClass}>
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">Sessions</h2>
                    <p className="text-sm text-gray-500">Signed in on a shared or lost device? Sign out everywhere else.</p>
                </div>
                <SessionControls />
            </section>
        </div>
    );
};

export default ProfilePage;
