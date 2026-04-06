"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, User, Ruler, Weight, Target, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const STEPS = ["gender", "age", "measurements", "goal", "activity"] as const;

export default function OnboardingPage() {
    const router = useRouter();
    const { token, logout } = useAuth();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        gender: "",
        age: "",
        height_cm: "",
        weight_kg: "",
        goal: "",
        activity_level: "sedentary",
    });
    const [loading, setLoading] = useState(false);

    const update = (key: string, value: string) => setForm({ ...form, [key]: value });
    const canNext = () => {
        const s = STEPS[step];
        if (s === "gender") return !!form.gender;
        if (s === "age") return !!form.age;
        if (s === "measurements") return !!form.height_cm && !!form.weight_kg;
        if (s === "goal") return !!form.goal;
        return true;
    };

    const submit = async () => {
        setLoading(true);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("http://localhost:8000/api/onboarding/", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ...form,
                    age: parseInt(form.age),
                    height_cm: parseFloat(form.height_cm),
                    weight_kg: parseFloat(form.weight_kg),
                }),
            });
            if (res.status === 401) {
                logout();
                return;
            }
            if (res.ok) {
                router.push("/dashboard");
            } else {
                alert("Failed to save profile.");
            }
        } catch {
            alert("Network error.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-display font-bold text-primary mb-2">Welcome to NourishAI</h1>
                <p className="text-on-surface-variant font-body mb-8">Let&apos;s personalize your experience.</p>

                {/* Progress */}
                <div className="flex gap-2 mb-10">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-surface-container-high"}`} />
                    ))}
                </div>

                {/* Step: Gender */}
                {STEPS[step] === "gender" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4"><User className="text-primary" size={24} /><h2 className="text-xl font-display font-semibold">What&apos;s your gender?</h2></div>
                        {[{ v: "male", l: "Male" }, { v: "female", l: "Female" }].map((o) => (
                            <button key={o.v} onClick={() => update("gender", o.v)}
                                className={`w-full p-4 rounded-2xl font-body text-left transition-all ${form.gender === o.v ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/15"}`}>
                                {o.l}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step: Age */}
                {STEPS[step] === "age" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4"><Ruler className="text-primary" size={24} /><h2 className="text-xl font-display font-semibold">How old are you?</h2></div>
                        <input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} placeholder="25"
                            className="w-full bg-surface-container-low px-4 py-4 rounded-xl text-4xl font-display font-bold text-primary text-center focus:outline-none focus:bg-surface-container-lowest transition-colors" />
                    </div>
                )}

                {/* Step: Measurements */}
                {STEPS[step] === "measurements" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4"><Weight className="text-primary" size={24} /><h2 className="text-xl font-display font-semibold">Your measurements</h2></div>
                        <div>
                            <label className="text-sm font-body text-on-surface-variant mb-2 block">Height (cm)</label>
                            <input type="number" value={form.height_cm} onChange={(e) => update("height_cm", e.target.value)} placeholder="175"
                                className="w-full bg-surface-container-low px-4 py-3 rounded-xl font-body text-on-surface focus:outline-none focus:bg-surface-container-lowest transition-colors" />
                        </div>
                        <div>
                            <label className="text-sm font-body text-on-surface-variant mb-2 block">Weight (kg)</label>
                            <input type="number" value={form.weight_kg} onChange={(e) => update("weight_kg", e.target.value)} placeholder="70"
                                className="w-full bg-surface-container-low px-4 py-3 rounded-xl font-body text-on-surface focus:outline-none focus:bg-surface-container-lowest transition-colors" />
                        </div>
                    </div>
                )}

                {/* Step: Goal */}
                {STEPS[step] === "goal" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4"><Target className="text-primary" size={24} /><h2 className="text-xl font-display font-semibold">What&apos;s your goal?</h2></div>
                        {[{ v: "lose", l: "Lose Weight", d: "Create a calorie deficit" }, { v: "maintain", l: "Maintain Weight", d: "Stay at your current weight" }, { v: "gain", l: "Gain Weight", d: "Build muscle and mass" }].map((o) => (
                            <button key={o.v} onClick={() => update("goal", o.v)}
                                className={`w-full p-4 rounded-2xl text-left transition-all ${form.goal === o.v ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/15"}`}>
                                <p className="font-display font-semibold">{o.l}</p>
                                <p className={`text-sm mt-1 ${form.goal === o.v ? "text-on-primary/80" : "text-on-surface-variant"}`}>{o.d}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step: Activity */}
                {STEPS[step] === "activity" && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-4"><Activity className="text-primary" size={24} /><h2 className="text-xl font-display font-semibold">Activity level?</h2></div>
                        {[{ v: "sedentary", l: "Sedentary", d: "Little or no exercise" }, { v: "light", l: "Lightly Active", d: "1-3 days/week" }, { v: "moderate", l: "Moderate", d: "3-5 days/week" }, { v: "active", l: "Very Active", d: "6-7 days/week" }, { v: "extra", l: "Extra Active", d: "Very hard exercise" }].map((o) => (
                            <button key={o.v} onClick={() => update("activity_level", o.v)}
                                className={`w-full p-3 rounded-2xl text-left transition-all ${form.activity_level === o.v ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/15"}`}>
                                <p className="font-display font-semibold text-sm">{o.l}</p>
                                <p className={`text-xs mt-0.5 ${form.activity_level === o.v ? "text-on-primary/80" : "text-on-surface-variant"}`}>{o.d}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-10">
                    {step > 0 ? (
                        <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-6 py-3 rounded-full font-body text-on-surface-variant hover:text-primary transition-colors">
                            <ArrowLeft size={18} /> Back
                        </button>
                    ) : <div />}

                    {step < STEPS.length - 1 ? (
                        <button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full font-display font-semibold transition-all ${canNext() ? "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md" : "bg-surface-container-high text-on-surface-variant cursor-not-allowed"}`}>
                            Next <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button onClick={submit} disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-display font-semibold shadow-md">
                            {loading ? "Saving..." : "Complete"} <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
