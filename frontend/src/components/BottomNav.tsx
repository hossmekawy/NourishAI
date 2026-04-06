"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanBarcode, Brain, User } from "lucide-react";

const tabs = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scan", label: "Log", icon: ScanBarcode },
    { href: "/coaching", label: "Coaching", icon: Brain },
    { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
            <div className="mx-4 mb-4 bg-surface-container-lowest/80 backdrop-blur-[20px] rounded-3xl shadow-[0_-4px_30px_rgba(11,54,29,0.08)] border border-outline-variant/15">
                <div className="flex justify-around items-center py-2">
                    {tabs.map((tab) => {
                        const isActive = pathname.startsWith(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200
                  ${isActive
                                        ? "text-primary bg-primary-container/30"
                                        : "text-on-surface-variant hover:text-primary"
                                    }`}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                                <span className={`text-xs font-body ${isActive ? "font-semibold" : "font-medium"}`}>
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
