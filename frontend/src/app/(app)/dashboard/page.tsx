"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, Plus, ArrowRight, Scale } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AddMealModal from "./AddMealModal";
import MealDetailModal from "./MealDetailModal";
import WeeklyCheckinModal from "./WeeklyCheckinModal";

interface MealItem {
    name: string;
    emoji: string;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface MealData {
    id: number;
    name: string;
    emoji: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meal_items: MealItem[];
    created_at?: string;
}

interface ProfileData {
    full_name?: string;
    avatar_url?: string | null;
    daily_calories_target?: number | null;
    tdee?: number | null;
}

export default function DashboardPage() {
    const router = useRouter();
    const { token, logout } = useAuth();
    const [meals, setMeals] = useState<MealData[]>([]);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState<MealData | null>(null);
    const [showCheckin, setShowCheckin] = useState(false);
    const [needsCheckin, setNeedsCheckin] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        try {
            const [mealRes, profileRes, checkinRes] = await Promise.all([
                fetch("http://localhost:8000/api/meals/", { headers }),
                fetch("http://localhost:8000/api/profile/", { headers }),
                fetch("http://localhost:8000/api/weight/check/", { headers }),
            ]);
            if (mealRes.status === 401 || profileRes.status === 401) {
                logout();
                return;
            }
            const mealData = await mealRes.json();
            const profileData = await profileRes.json();
            const checkinData = await checkinRes.json();
            setMeals(mealData);
            setProfile(profileData);
            setNeedsCheckin(checkinData.needs_checkin);
        } catch {
            console.error("Failed to fetch data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    // Calculations
    const totalCals = meals.reduce((s, m) => s + m.calories, 0);
    const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
    const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
    const totalFat = meals.reduce((s, m) => s + m.fat, 0);

    const targetCals = profile?.daily_calories_target || 2000;
    const calsLeft = Math.max(0, targetCals - totalCals);
    const calsPercent = Math.min(100, (totalCals / targetCals) * 100);

    // Macro targets (30% protein, 40% carbs, 30% fat)
    const proteinTarget = Math.round((targetCals * 0.3) / 4);
    const carbsTarget = Math.round((targetCals * 0.4) / 4);
    const fatTarget = Math.round((targetCals * 0.3) / 9);

    const ringRadius = 80;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (calsPercent / 100) * ringCircumference;

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
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-2 border-primary/20">
                        {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={20} className="text-primary" />
                        )}
                    </div>
                    <h1 className="text-lg font-display font-bold text-primary line-clamp-1">
                        {profile?.full_name || "Vitality Journal"}
                    </h1>
                </div>
                <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
                    <Settings size={16} className="text-on-surface-variant" />
                </button>
            </div>

            {/* Weekly Check-in Alert */}
            {needsCheckin && (
                <button onClick={() => setShowCheckin(true)}
                    className="w-full bg-primary-container/40 rounded-2xl p-4 mb-5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform border border-primary/15">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Scale size={20} className="text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-display font-bold text-on-surface">Weekly Check-in Due</p>
                        <p className="text-xs font-body text-on-surface-variant">Update your weight & InBody scan</p>
                    </div>
                    <ArrowRight size={16} className="text-primary" />
                </button>
            )}

            {/* Daily Nourishment Badge */}
            <div className="flex justify-center mb-5">
                <span className="bg-primary-container/50 text-primary font-display text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Daily Nourishment
                </span>
            </div>

            {/* Calorie Ring */}
            <div className="flex justify-center mb-8">
                <div className="relative">
                    <svg width="200" height="200" className="transform -rotate-90">
                        <circle cx="100" cy="100" r={ringRadius} fill="none" stroke="var(--color-surface-container-low)" strokeWidth="16" />
                        <circle cx="100" cy="100" r={ringRadius} fill="none"
                            stroke="url(#calGradient)" strokeWidth="16" strokeLinecap="round"
                            strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                            className="transition-all duration-1000"
                        />
                        <defs>
                            <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--color-primary)" />
                                <stop offset="100%" stopColor="var(--color-primary-container)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-xs font-body text-on-surface-variant">Calories Left</p>
                        <p className="text-4xl font-display font-bold text-primary">{Math.round(calsLeft)}</p>
                        <p className="text-xs font-body text-on-surface-variant">{Math.round(totalCals)} / {targetCals} kcal</p>
                    </div>
                    {totalCals > 0 && (
                        <div className="absolute top-2 -right-4 bg-surface-container-lowest shadow-md rounded-full px-2 py-1 flex items-center gap-1 text-xs">
                            <span>⚡</span>
                            <span className="font-display font-semibold text-primary">Energy</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Macros Section */}
            <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_20px_40px_rgba(11,54,29,0.06)] mb-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-display font-bold text-on-surface">Macros</h2>
                        <p className="text-xs font-body text-on-surface-variant">Fueling your vitality</p>
                    </div>
                    <span className="text-2xl">🍴</span>
                </div>

                {[
                    { label: "Protein", emoji: "🥩", value: Math.round(totalProtein), target: proteinTarget, color: "bg-primary" },
                    { label: "Carbs", emoji: "🌾", value: Math.round(totalCarbs), target: carbsTarget, color: "bg-yellow-500" },
                    { label: "Fat", emoji: "🧈", value: Math.round(totalFat), target: fatTarget, color: "bg-primary-container" },
                ].map((m) => (
                    <div key={m.label} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold">{m.emoji} {m.label}</p>
                            <p className="text-xs font-body text-on-surface font-medium">{m.value}g / {m.target}g</p>
                        </div>
                        <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div className={`h-full ${m.color} rounded-full transition-all duration-700`}
                                style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Daily Log */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-display font-bold text-on-surface">Daily Log</h2>
                    {meals.length > 3 && (
                        <button className="text-xs font-body text-primary font-semibold flex items-center gap-1">
                            View All <ArrowRight size={14} />
                        </button>
                    )}
                </div>

                {meals.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-2xl p-6 text-center">
                        <p className="text-3xl mb-2">🍽️</p>
                        <p className="font-body text-on-surface-variant text-sm">No meals logged yet today.</p>
                        <p className="font-body text-on-surface-variant text-xs mt-1">Tap the + button to start logging!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {meals.map((meal) => (
                            <button key={meal.id} onClick={() => setSelectedMeal(meal)}
                                className="w-full flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-4 shadow-sm text-left active:scale-[0.99] transition-transform">
                                <span className="text-3xl flex-shrink-0">{meal.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-display font-semibold text-on-surface text-sm truncate">{meal.name}</p>
                                    <p className="font-body text-on-surface-variant text-xs">
                                        P:{Math.round(meal.protein)}g &nbsp; C:{Math.round(meal.carbs)}g &nbsp; F:{Math.round(meal.fat)}g
                                    </p>
                                </div>
                                <p className="font-display font-bold text-primary text-sm flex-shrink-0">{Math.round(meal.calories)} kcal</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB + Button */}
            <button onClick={() => setShowAddModal(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-[0_8px_24px_rgba(11,54,29,0.25)] flex items-center justify-center active:scale-90 transition-transform z-40">
                <Plus size={28} />
            </button>

            {/* Modals */}
            <AddMealModal open={showAddModal} onClose={() => setShowAddModal(false)} onSaved={fetchData} />
            <MealDetailModal
                meal={selectedMeal}
                onClose={() => setSelectedMeal(null)}
                onUpdated={fetchData}
                onDeleted={fetchData}
            />
            <WeeklyCheckinModal
                open={showCheckin}
                onClose={() => setShowCheckin(false)}
                onSaved={() => { fetchData(); setNeedsCheckin(false); }}
            />
        </div>
    );
}
