"use client";

import { useState, useEffect } from "react";
import { UtensilsCrossed, Dumbbell, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DietPlanWizard from "./DietPlanWizard";
import DietPlanView from "./DietPlanView";
import GymPlanWizard from "./GymPlanWizard";
import GymPlanView from "./GymPlanView";

type Tab = "diet" | "gym";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CoachingPage() {
    const { token, logout } = useAuth();
    const [tab, setTab] = useState<Tab>("diet");
    const [dietPlan, setDietPlan] = useState<any>(null);
    const [gymPlan, setGymPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showDietWizard, setShowDietWizard] = useState(false);
    const [showGymWizard, setShowGymWizard] = useState(false);

    const headers = (): Record<string, string> => {
        const h: Record<string, string> = {};
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const [dietRes, gymRes] = await Promise.all([
                fetch("http://localhost:8000/api/coaching/diet/", { headers: headers() }),
                fetch("http://localhost:8000/api/coaching/gym/", { headers: headers() }),
            ]);
            if (dietRes.status === 401) { logout(); return; }
            const dietData = await dietRes.json();
            const gymData = await gymRes.json();
            setDietPlan(dietData.plan);
            setGymPlan(gymData.plan);
        } catch {
            console.error("Failed to load coaching data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (token) fetchPlans();
    }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto pb-28">
            {/* Header */}
            <div className="mb-5">
                <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
                    <Sparkles size={22} /> AI Coaching
                </h1>
                <p className="text-sm font-body text-on-surface-variant mt-0.5">
                    Personalized diet & workout plans
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button onClick={() => setTab("diet")}
                    className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-body font-semibold text-sm transition-all ${tab === "diet" ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                    <UtensilsCrossed size={18} /> Diet Plan 🍽️
                </button>
                <button onClick={() => setTab("gym")}
                    className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-body font-semibold text-sm transition-all ${tab === "gym" ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                    <Dumbbell size={18} /> Gym Plan 💪
                </button>
            </div>

            {/* Diet Tab */}
            {tab === "diet" && (
                <>
                    {showDietWizard ? (
                        <DietPlanWizard
                            token={token}
                            onGenerated={() => { setShowDietWizard(false); fetchPlans(); }}
                            onCancel={() => setShowDietWizard(false)}
                        />
                    ) : dietPlan ? (
                        <DietPlanView
                            plan={dietPlan}
                            token={token}
                            onUpdated={fetchPlans}
                            onReset={() => setShowDietWizard(true)}
                        />
                    ) : (
                        <EmptyState
                            emoji="🍽️"
                            title="No Diet Plan Yet"
                            desc="Create a personalized meal plan based on your preferences, liked foods, and calorie goals."
                            buttonLabel="Create Diet Plan"
                            onClick={() => setShowDietWizard(true)}
                        />
                    )}
                </>
            )}

            {/* Gym Tab */}
            {tab === "gym" && (
                <>
                    {showGymWizard ? (
                        <GymPlanWizard
                            token={token}
                            onGenerated={() => { setShowGymWizard(false); fetchPlans(); }}
                            onCancel={() => setShowGymWizard(false)}
                        />
                    ) : gymPlan ? (
                        <GymPlanView
                            plan={gymPlan}
                            token={token}
                            onUpdated={fetchPlans}
                            onReset={() => setShowGymWizard(true)}
                        />
                    ) : (
                        <EmptyState
                            emoji="💪"
                            title="No Gym Plan Yet"
                            desc="Build a custom workout routine with AI-selected exercises and video tutorials."
                            buttonLabel="Create Gym Plan"
                            onClick={() => setShowGymWizard(true)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function EmptyState({ emoji, title, desc, buttonLabel, onClick }: {
    emoji: string; title: string; desc: string; buttonLabel: string; onClick: () => void;
}) {
    return (
        <div className="text-center py-10">
            <p className="text-6xl mb-4">{emoji}</p>
            <h2 className="text-xl font-display font-bold text-on-surface mb-2">{title}</h2>
            <p className="font-body text-on-surface-variant text-sm mb-6 max-w-xs mx-auto">{desc}</p>
            <button onClick={onClick}
                className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-body font-semibold shadow-lg flex items-center gap-2 mx-auto active:scale-[0.98] transition-transform">
                <Sparkles size={18} /> {buttonLabel}
            </button>
        </div>
    );
}
