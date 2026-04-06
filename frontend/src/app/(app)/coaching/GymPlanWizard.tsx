"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Dumbbell } from "lucide-react";

interface Props {
    onGenerated: () => void;
    onCancel: () => void;
    token: string | null;
}

const STEPS = ["days", "duration", "focus", "level", "review"] as const;
type Step = typeof STEPS[number];

const FOCUS_OPTIONS = [
    { key: "strength", label: "Strength", emoji: "💪" },
    { key: "hypertrophy", label: "Muscle Building", emoji: "🏋️" },
    { key: "cardio", label: "Cardio", emoji: "🫀" },
    { key: "flexibility", label: "Flexibility", emoji: "🧘" },
    { key: "weight_loss", label: "Fat Burn", emoji: "🔥" },
    { key: "endurance", label: "Endurance", emoji: "🏃" },
];

const LEVEL_OPTIONS = [
    { key: "beginner", label: "Beginner", emoji: "🟢", desc: "Just starting out" },
    { key: "intermediate", label: "Intermediate", emoji: "🟡", desc: "1-3 years training" },
    { key: "advanced", label: "Advanced", emoji: "🔴", desc: "3+ years training" },
];

export default function GymPlanWizard({ onGenerated, onCancel, token }: Props) {
    const [step, setStep] = useState<Step>("days");
    const [daysPerWeek, setDaysPerWeek] = useState(3);
    const [sessionMinutes, setSessionMinutes] = useState(60);
    const [focusAreas, setFocusAreas] = useState<string[]>(["strength"]);
    const [fitnessLevel, setFitnessLevel] = useState("beginner");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const stepIdx = STEPS.indexOf(step);

    const toggleFocus = (key: string) => {
        setFocusAreas((prev) =>
            prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
        );
    };

    const next = () => {
        if (step === "focus" && focusAreas.length === 0) {
            setError("Select at least one focus area.");
            return;
        }
        setError("");
        if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
    };
    const back = () => {
        setError("");
        if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("http://localhost:8000/api/coaching/gym/generate/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    days_per_week: daysPerWeek,
                    session_minutes: sessionMinutes,
                    focus_areas: focusAreas,
                    fitness_level: fitnessLevel,
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
                <p className="font-display text-lg font-bold text-primary">Building your workout plan...</p>
                <p className="font-body text-sm text-on-surface-variant text-center">
                    AI is designing a personalized training program with video tutorials 💪
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

            {/* Step: Days per week */}
            {step === "days" && (
                <div className="text-center space-y-5">
                    <div>
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">كم يوم تمرين في الاسبوع؟</h3>
                        <p className="text-sm font-body text-on-surface-variant">How many training days per week?</p>
                    </div>
                    <div className="flex justify-center gap-3">
                        {[2, 3, 4, 5, 6].map((n) => (
                            <button key={n} onClick={() => setDaysPerWeek(n)}
                                className={`w-14 h-14 rounded-2xl font-display text-xl font-bold transition-all ${daysPerWeek === n ? "bg-primary text-on-primary scale-110 shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-body text-on-surface-variant">
                        {daysPerWeek === 2 ? "🏠 Light — 2 sessions" :
                            daysPerWeek === 3 ? "🏋️ Balanced — 3 sessions" :
                                daysPerWeek === 4 ? "💪 Active — 4 sessions" :
                                    daysPerWeek === 5 ? "🔥 Intense — 5 sessions" :
                                        "⚡ Extreme — 6 sessions"}
                    </p>
                </div>
            )}

            {/* Step: Session Duration */}
            {step === "duration" && (
                <div className="text-center space-y-5">
                    <div>
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">مدة التمرين؟</h3>
                        <p className="text-sm font-body text-on-surface-variant">Session duration in minutes</p>
                    </div>
                    <div className="flex justify-center gap-3 flex-wrap">
                        {[30, 45, 60, 75, 90].map((n) => (
                            <button key={n} onClick={() => setSessionMinutes(n)}
                                className={`px-5 py-4 rounded-2xl font-display text-lg font-bold transition-all ${sessionMinutes === n ? "bg-primary text-on-primary scale-105 shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                {n}<span className="text-xs font-body ml-1">min</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-body text-on-surface-variant">
                        {sessionMinutes <= 30 ? "⚡ Quick session" :
                            sessionMinutes <= 45 ? "🏃 Moderate session" :
                                sessionMinutes <= 60 ? "🏋️ Standard session" :
                                    sessionMinutes <= 75 ? "💪 Extended session" :
                                        "🔥 Long session"}
                    </p>
                </div>
            )}

            {/* Step: Focus Areas */}
            {step === "focus" && (
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">ايه تركيزك؟</h3>
                        <p className="text-sm font-body text-on-surface-variant">Select your focus areas (multi-select)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {FOCUS_OPTIONS.map((opt) => (
                            <button key={opt.key} onClick={() => toggleFocus(opt.key)}
                                className={`p-4 rounded-2xl text-left transition-all ${focusAreas.includes(opt.key) ? "bg-primary text-on-primary shadow-lg scale-[1.02]" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                <span className="text-2xl block mb-1">{opt.emoji}</span>
                                <p className="font-display font-semibold text-sm">{opt.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step: Fitness Level */}
            {step === "level" && (
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-display font-bold text-on-surface mb-1">مستواك الرياضي؟</h3>
                        <p className="text-sm font-body text-on-surface-variant">What&apos;s your fitness level?</p>
                    </div>
                    <div className="space-y-2">
                        {LEVEL_OPTIONS.map((opt) => (
                            <button key={opt.key} onClick={() => setFitnessLevel(opt.key)}
                                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left ${fitnessLevel === opt.key ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                                <span className="text-2xl">{opt.emoji}</span>
                                <div>
                                    <p className="font-display font-semibold">{opt.label}</p>
                                    <p className={`text-xs font-body ${fitnessLevel === opt.key ? "text-on-primary/80" : "text-on-surface-variant"}`}>{opt.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step: Review */}
            {step === "review" && (
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-display font-bold text-primary mb-1">Review Your Preferences 💪</h3>
                        <p className="text-sm font-body text-on-surface-variant">Ready to build your workout plan?</p>
                    </div>
                    <div className="bg-surface-container-lowest rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm font-body text-on-surface-variant">🗓️ Days/week</span>
                            <span className="font-display font-bold text-primary">{daysPerWeek}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-body text-on-surface-variant">⏱️ Duration</span>
                            <span className="font-display font-bold text-primary">{sessionMinutes} min</span>
                        </div>
                        <div>
                            <span className="text-sm font-body text-on-surface-variant">🎯 Focus</span>
                            <p className="font-body text-sm text-on-surface mt-1">
                                {focusAreas.map((f) => FOCUS_OPTIONS.find((o) => o.key === f)?.label).join(", ")}
                            </p>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-body text-on-surface-variant">📊 Level</span>
                            <span className="font-display font-bold text-primary capitalize">{fitnessLevel}</span>
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
                        <Dumbbell size={16} /> Generate Plan
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
