"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, X, Plus } from "lucide-react";

interface Props {
    onGenerated: () => void;
    onCancel: () => void;
    token: string | null;
}

const STEPS = ["meals", "snacks", "liked", "disliked", "review"] as const;
type Step = typeof STEPS[number];

const POPULAR_FOODS = [
    "كشري", "فول", "طعمية", "محشي", "ملوخية", "فتة", "شاورما",
    "أرز", "خبز", "بيض", "دجاج", "لحم", "سمك", "باستا",
    "Rice", "Chicken", "Eggs", "Oats", "Salad", "Fish",
    "Yogurt", "Fruits", "Pasta", "Beef", "Bread", "Cheese",
];

export default function DietPlanWizard({ onGenerated, onCancel, token }: Props) {
    const [step, setStep] = useState<Step>("meals");
    const [mealsPerDay, setMealsPerDay] = useState(3);
    const [snacksPerDay, setSnacksPerDay] = useState(1);
    const [likedFoods, setLikedFoods] = useState<string[]>([]);
    const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const stepIdx = STEPS.indexOf(step);

    const toggleTag = (list: string[], setList: (v: string[]) => void, tag: string) => {
        setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
    };

    const addCustomTag = (list: string[], setList: (v: string[]) => void) => {
        if (customTag.trim() && !list.includes(customTag.trim())) {
            setList([...list, customTag.trim()]);
            setCustomTag("");
        }
    };

    const next = () => {
        if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
    };
    const back = () => {
        if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("http://localhost:8000/api/coaching/diet/generate/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    meals_per_day: mealsPerDay,
                    snacks_per_day: snacksPerDay,
                    liked_foods: likedFoods,
                    disliked_foods: dislikedFoods,
                }),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                onGenerated();
            }
        } catch {
            setError("Failed to generate plan. Try again.");
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 size={36} className="text-primary animate-spin" />
                <p className="font-display text-lg font-bold text-primary">Creating your perfect diet plan...</p>
                <p className="font-body text-sm text-on-surface-variant text-center">
                    AI is analyzing your preferences, calculating macros, and building your personalized meal plan ✨
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Progress Bar */}
            <div className="flex items-center gap-1.5 mb-2">
                {STEPS.map((s, i) => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i <= stepIdx ? "bg-primary" : "bg-surface-container-high"}`} />
                ))}
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

            {/* Step: Meals per day */}
            {step === "meals" && (
                <div className="text-center space-y-5">
                    <div>
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">كم عدد الوجبات؟</h3>
                        <p className="text-sm font-body text-on-surface-variant">How many meals per day?</p>
                    </div>
                    <div className="flex justify-center gap-3">
                        {[2, 3, 4, 5, 6].map((n) => (
                            <button key={n} onClick={() => setMealsPerDay(n)}
                                className={`w-14 h-14 rounded-2xl font-display text-xl font-bold transition-all ${mealsPerDay === n ? "bg-primary text-on-primary scale-110 shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-body text-on-surface-variant">
                        {mealsPerDay === 2 ? "🍽️ Simple — 2 big meals" :
                            mealsPerDay === 3 ? "🍽️ Classic — Breakfast, Lunch, Dinner" :
                                mealsPerDay === 4 ? "🍽️ Active — 4 balanced meals" :
                                    mealsPerDay === 5 ? "🍽️ Athlete — 5 smaller meals" :
                                        "🍽️ Bodybuilder — 6 micro meals"}
                    </p>
                </div>
            )}

            {/* Step: Snacks */}
            {step === "snacks" && (
                <div className="text-center space-y-5">
                    <div>
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">كم عدد السناكس؟</h3>
                        <p className="text-sm font-body text-on-surface-variant">How many snacks between meals?</p>
                    </div>
                    <div className="flex justify-center gap-3">
                        {[0, 1, 2, 3].map((n) => (
                            <button key={n} onClick={() => setSnacksPerDay(n)}
                                className={`w-14 h-14 rounded-2xl font-display text-xl font-bold transition-all ${snacksPerDay === n ? "bg-primary text-on-primary scale-110 shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-body text-on-surface-variant">
                        {snacksPerDay === 0 ? "🚫 No snacks" :
                            snacksPerDay === 1 ? "🍎 One snack" :
                                snacksPerDay === 2 ? "🍎🥜 Two snacks" :
                                    "🍎🥜🍌 Three snacks"}
                    </p>
                </div>
            )}

            {/* Step: Liked Foods */}
            {step === "liked" && (
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">ايه الأكلات البتحبها؟ 💚</h3>
                        <p className="text-sm font-body text-on-surface-variant">Select foods you enjoy (or type your own)</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {POPULAR_FOODS.map((f) => (
                            <button key={f} onClick={() => toggleTag(likedFoods, setLikedFoods, f)}
                                className={`px-3 py-1.5 rounded-full text-sm font-body font-medium transition-all ${likedFoods.includes(f) ? "bg-primary text-on-primary" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addCustomTag(likedFoods, setLikedFoods); }}
                            placeholder="Add custom food..." dir="auto"
                            className="flex-1 bg-surface-container-lowest px-4 py-2 rounded-xl border border-outline-variant/20 font-body text-sm focus:outline-none focus:border-primary/50" />
                        <button onClick={() => addCustomTag(likedFoods, setLikedFoods)}
                            className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary">
                            <Plus size={16} />
                        </button>
                    </div>
                    {likedFoods.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {likedFoods.map((f) => (
                                <span key={f} className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-body font-medium flex items-center gap-1">
                                    {f}
                                    <button onClick={() => setLikedFoods(likedFoods.filter((t) => t !== f))}><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step: Disliked Foods */}
            {step === "disliked" && (
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">ايه الأكلات الغير محببة؟ 🚫</h3>
                        <p className="text-sm font-body text-on-surface-variant">Select foods to avoid</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {POPULAR_FOODS.map((f) => (
                            <button key={f} onClick={() => toggleTag(dislikedFoods, setDislikedFoods, f)}
                                className={`px-3 py-1.5 rounded-full text-sm font-body font-medium transition-all ${dislikedFoods.includes(f) ? "bg-red-500 text-white" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addCustomTag(dislikedFoods, setDislikedFoods); }}
                            placeholder="Add custom food to avoid..." dir="auto"
                            className="flex-1 bg-surface-container-lowest px-4 py-2 rounded-xl border border-outline-variant/20 font-body text-sm focus:outline-none focus:border-primary/50" />
                        <button onClick={() => addCustomTag(dislikedFoods, setDislikedFoods)}
                            className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white">
                            <Plus size={16} />
                        </button>
                    </div>
                    {dislikedFoods.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {dislikedFoods.map((f) => (
                                <span key={f} className="bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-xs font-body font-medium flex items-center gap-1">
                                    🚫 {f}
                                    <button onClick={() => setDislikedFoods(dislikedFoods.filter((t) => t !== f))}><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step: Review & Generate */}
            {step === "review" && (
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-display font-bold text-primary mb-1">Review Your Preferences ✨</h3>
                        <p className="text-sm font-body text-on-surface-variant">Everything looks good? Let AI create your plan!</p>
                    </div>
                    <div className="bg-surface-container-lowest rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm font-body text-on-surface-variant">🍽️ Meals/day</span>
                            <span className="font-display font-bold text-primary">{mealsPerDay}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-body text-on-surface-variant">🍎 Snacks/day</span>
                            <span className="font-display font-bold text-primary">{snacksPerDay}</span>
                        </div>
                        <div>
                            <span className="text-sm font-body text-on-surface-variant">💚 Liked foods</span>
                            <p className="font-body text-sm text-on-surface mt-1">{likedFoods.length > 0 ? likedFoods.join(", ") : "No preference"}</p>
                        </div>
                        <div>
                            <span className="text-sm font-body text-on-surface-variant">🚫 Disliked foods</span>
                            <p className="font-body text-sm text-on-surface mt-1">{dislikedFoods.length > 0 ? dislikedFoods.join(", ") : "None"}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
                {stepIdx > 0 ? (
                    <button onClick={back}
                        className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Back
                    </button>
                ) : (
                    <button onClick={onCancel}
                        className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold">
                        Cancel
                    </button>
                )}
                {step === "review" ? (
                    <button onClick={handleGenerate}
                        className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold flex items-center justify-center gap-2 shadow-lg">
                        <Sparkles size={16} /> Generate Plan
                    </button>
                ) : (
                    <button onClick={next}
                        className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold flex items-center justify-center gap-2">
                        Next <ArrowRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
