"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { token, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const [onboarded, setOnboarded] = useState(true);

    useEffect(() => {
        if (!token) return;
        // Skip check if already on the onboarding page
        if (pathname === "/onboarding") {
            setChecked(true);
            return;
        }

        const checkOnboarding = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/profile/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 401) { logout(); return; }
                const data = await res.json();
                if (!data.onboarding_complete) {
                    setOnboarded(false);
                    router.replace("/onboarding");
                } else {
                    setOnboarded(true);
                }
            } catch { /* ignore */ }
            setChecked(true);
        };

        checkOnboarding();
    }, [token, pathname]);

    // Show loading while checking onboarding status
    if (token && !checked && pathname !== "/onboarding") {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // If not onboarded and not on the onboarding page, show nothing (redirect happening)
    if (token && !onboarded && pathname !== "/onboarding") {
        return null;
    }

    // On onboarding page, hide the bottom nav
    if (pathname === "/onboarding") {
        return (
            <div className="min-h-screen bg-surface">
                {children}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface pb-24">
            {children}
            <BottomNav />
        </div>
    );
}
