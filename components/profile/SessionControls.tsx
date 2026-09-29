'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOutOtherDevices, signOutUser } from "@/lib/actions/auth.actions";

const buttonClass = "h-11 cursor-pointer gap-2 border border-gray-600 bg-transparent px-4 text-gray-300 hover:bg-gray-700";

const SessionControls = () => {
    const router = useRouter();
    const [pending, setPending] = useState<'others' | 'self' | null>(null);

    const handleOthers = async () => {
        setPending('others');
        const result = await signOutOtherDevices();
        setPending(null);
        if (result.success) toast.success("Signed out of all other devices");
        else toast.error("Could not sign out other devices", { description: result.error });
    };

    const handleSelf = async () => {
        setPending('self');
        const result = await signOutUser();
        if (!result.success) {
            setPending(null);
            toast.error("Sign out failed", { description: result.error });
            return;
        }
        router.push("/sign-in");
        router.refresh();
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleOthers} disabled={pending !== null} className={buttonClass}>
                <MonitorSmartphone className="h-4 w-4" />
                {pending === 'others' ? "Signing out..." : "Sign out other devices"}
            </Button>
            <Button onClick={handleSelf} disabled={pending !== null} className={`${buttonClass} text-red-400 hover:text-red-300`}>
                <LogOut className="h-4 w-4" />
                {pending === 'self' ? "Signing out..." : "Sign out"}
            </Button>
        </div>
    );
};

export default SessionControls;
