"use client";

import { useState } from "react";
import { RefreshCw, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface MealItem {
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface Meal {
    type?: string;
    name: string;
    emoji: string;
    time?: string;
    items: MealItem[];
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
}

interface PlanData {
    meals: Meal[];
    snacks: Meal[];
    daily_total: { calories: number; protein: number; carbs: number; fat: number };
}

interface DietPlanData {
    id: number;
    plan_data: PlanData;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
}

interface Props {
    plan: DietPlanData;
    token: string | null;
    onUpdated: () => void;
    onReset: () => void;
}

export default function DietPlanView({ plan, token, onUpdated, onReset }: Props) {
    const [swapping, setSwapping] = useState<string | null>(null);
    const [swapRequest, setSwapRequest] = useState("");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [tracking, setTracking] = useState<Record<string, boolean>>({});
    const [savingTrack, setSavingTrack] = useState(false);

    const headers = (): Record<string, string> => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const planData = plan.plan_data;
    const allMeals = [...(planData.meals || []), ...(planData.snacks || [])];
    const daily = planData.daily_total || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const handleSwap = async (mealType: string, mealIndex: number) => {
        const key = `${mealType}-${mealIndex}`;
        setSwapping(key);
        try {
            const res = await fetch("http://localhost:8000/api/coaching/diet/swap/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    meal_type: mealType,
                    meal_index: mealIndex,
                    swap_request: swapRequest,
                }),
            });
            const data = await res.json();
            if (!data.error) {
                onUpdated();
                setSwapRequest("");
            }
        } catch { /* ignore */ }
        setSwapping(null);
    };

    const toggleMealTrack = (key: string) => {
        setTracking((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const saveTracking = async () => {
        setSavingTrack(true);
        try {
            await fetch("http://localhost:8000/api/coaching/diet/track/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ meals_completed: tracking }),
            });
        } catch { /* ignore */ }
        setSavingTrack(false);
    };

    const completedCount = Object.values(tracking).filter(Boolean).length;
    const totalMeals = allMeals.length;
    const adherence = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* Daily Summary */}
            <div className="bg-primary-container/20 rounded-2xl p-4">
                <div className="text-center mb-3">
                    <p className="text-3xl font-display font-bold text-primary">{Math.round(daily.calories)}<span className="text-sm font-body ml-1">kcal</span></p>
                    <p className="text-xs font-body text-on-surface-variant">Daily Target</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { l: "Protein", v: daily.protein, e: "🥩" },
                        { l: "Carbs", v: daily.carbs, e: "🌾" },
                        { l: "Fat", v: daily.fat, e: "🧈" },
                    ].map((m) => (
                        <div key={m.l} className="text-center">
                            <p className="text-lg font-display font-bold text-on-surface">{Math.round(m.v)}g</p>
                            <p className="text-[10px] text-on-surface-variant">{m.e} {m.l}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Daily Adherence */}
            <div className="bg-surface-container-lowest rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-body font-semibold text-on-surface">Today&apos;s Adherence</p>
                    <span className="text-xs font-body text-primary font-bold">{adherence}%</span>
                </div>
                <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${adherence}%` }} />
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">{completedCount}/{totalMeals} meals completed</p>
            </div>

            {/* Meals */}
            <div>
                <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold mb-3">🍽️ Meals</p>
                <div className="space-y-2">
                    {(planData.meals || []).map((meal, idx) => {
                        const key = `meals-${idx}`;
                        const isExpanded = expanded === key;
                        const isSwapping = swapping === key;
                        return (
                            <div key={idx} className="bg-surface-container-lowest rounded-2xl overflow-hidden">
                                <div className="p-4 flex items-center gap-3">
                                    <button onClick={() => toggleMealTrack(key)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${tracking[key] ? "bg-primary border-primary" : "border-outline-variant/30"}`}>
                                        {tracking[key] && <Check size={14} className="text-on-primary" />}
                                    </button>
                                    <span className="text-2xl flex-shrink-0">{meal.emoji}</span>
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                                        <p className="font-display font-semibold text-on-surface text-sm truncate">{meal.name}</p>
                                        <p className="text-[10px] font-body text-on-surface-variant">{meal.time || meal.type}</p>
                                    </div>
                                    <p className="font-display font-bold text-primary text-sm flex-shrink-0">{meal.total_calories} kcal</p>
                                    <button onClick={() => setExpanded(isExpanded ? null : key)} className="text-on-surface-variant">
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-2">
                                        <div className="border-t border-outline-variant/10 pt-3">
                                            {meal.items.map((item, i) => (
                                                <div key={i} className="flex justify-between text-xs font-body py-1">
                                                    <span className="text-on-surface">{item.name} ({item.grams}g)</span>
                                                    <span className="text-on-surface-variant">{item.calories} kcal</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center bg-surface-container-low rounded-xl p-2">
                                            <div><p className="text-xs font-bold text-primary">{meal.total_protein}g</p><p className="text-[9px] text-on-surface-variant">Protein</p></div>
                                            <div><p className="text-xs font-bold text-yellow-600">{meal.total_carbs}g</p><p className="text-[9px] text-on-surface-variant">Carbs</p></div>
                                            <div><p className="text-xs font-bold text-orange-500">{meal.total_fat}g</p><p className="text-[9px] text-on-surface-variant">Fat</p></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <input value={swapRequest} onChange={(e) => setSwapRequest(e.target.value)}
                                                placeholder="e.g. swap with fish meal..." dir="auto"
                                                className="flex-1 text-xs bg-surface-container-low rounded-lg px-3 py-2 font-body focus:outline-none" />
                                            <button onClick={() => handleSwap("meals", idx)} disabled={isSwapping}
                                                className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-body font-semibold flex items-center gap-1 disabled:opacity-50">
                                                {isSwapping ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                Swap
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Snacks */}
            {(planData.snacks || []).length > 0 && (
                <div>
                    <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold mb-3">🍎 Snacks</p>
                    <div className="space-y-2">
                        {(planData.snacks || []).map((snack, idx) => {
                            const key = `snacks-${idx}`;
                            const isExpanded = expanded === key;
                            const isSwapping = swapping === key;
                            return (
                                <div key={idx} className="bg-surface-container-lowest rounded-2xl overflow-hidden">
                                    <div className="p-4 flex items-center gap-3">
                                        <button onClick={() => toggleMealTrack(key)}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${tracking[key] ? "bg-primary border-primary" : "border-outline-variant/30"}`}>
                                            {tracking[key] && <Check size={14} className="text-on-primary" />}
                                        </button>
                                        <span className="text-2xl flex-shrink-0">{snack.emoji}</span>
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                                            <p className="font-display font-semibold text-on-surface text-sm truncate">{snack.name}</p>
                                        </div>
                                        <p className="font-display font-bold text-primary text-sm flex-shrink-0">{snack.total_calories} kcal</p>
                                        <button onClick={() => setExpanded(isExpanded ? null : key)} className="text-on-surface-variant">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-2">
                                            <div className="border-t border-outline-variant/10 pt-3">
                                                {snack.items.map((item, i) => (
                                                    <div key={i} className="flex justify-between text-xs font-body py-1">
                                                        <span className="text-on-surface">{item.name} ({item.grams}g)</span>
                                                        <span className="text-on-surface-variant">{item.calories} kcal</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input value={swapRequest} onChange={(e) => setSwapRequest(e.target.value)}
                                                    placeholder="e.g. swap with nuts..." dir="auto"
                                                    className="flex-1 text-xs bg-surface-container-low rounded-lg px-3 py-2 font-body focus:outline-none" />
                                                <button onClick={() => handleSwap("snacks", idx)} disabled={isSwapping}
                                                    className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-body font-semibold flex items-center gap-1 disabled:opacity-50">
                                                    {isSwapping ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                    Swap
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button onClick={saveTracking} disabled={savingTrack}
                    className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    {savingTrack ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save Progress
                </button>
                <button onClick={onReset}
                    className="py-3 px-5 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold flex items-center justify-center gap-2">
                    <RefreshCw size={16} /> New Plan
                </button>
            </div>
        </div>
    );
}
