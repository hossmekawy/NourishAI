"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Ruler, Weight, Target, Activity, Flame, TrendingUp, ScanBarcode, Save, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ProfileData {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string | null;
    gender: string;
    age: number | null;
    weight_kg: number | null;
    height_cm: number | null;
    goal: string;
    activity_level: string;
    bmi: number | null;
    bmr: number | null;
    tdee: number | null;
    daily_calories_target: number | null;
    onboarding_complete: boolean;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Settings form state
    const [settingsForm, setSettingsForm] = useState({
        first_name: "",
        last_name: "",
        avatar_url: "",
        password: "",
    });

    const { token, logout } = useAuth();
    const router = useRouter();

    // Editable form state
    const [form, setForm] = useState({
        height_cm: "",
        weight_kg: "",
        age: "",
        gender: "",
        goal: "",
        activity_level: "sedentary",
    });

    useEffect(() => {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        fetch("http://localhost:8000/api/profile/", { headers })
            .then((r) => {
                if (r.status === 401) {
                    logout();
                    throw new Error("Unauthorized");
                }
                return r.json();
            })
            .then((data: ProfileData) => {
                setProfile(data);
                setForm({
                    height_cm: data.height_cm?.toString() || "",
                    weight_kg: data.weight_kg?.toString() || "",
                    age: data.age?.toString() || "",
                    gender: data.gender || "",
                    goal: data.goal || "",
                    activity_level: data.activity_level || "sedentary",
                });
                setSettingsForm({
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    avatar_url: data.avatar_url || "",
                    password: "",
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    const update = (key: string, value: string) => {
        setForm({ ...form, [key]: value });
        setSaved(false);
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch("http://localhost:8000/api/onboarding/", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ...form,
                    age: form.age ? parseInt(form.age) : null,
                    height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
                    weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch {
            alert("Failed to save profile.");
        }
        setSaving(false);
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch("http://localhost:8000/api/settings/", {
                method: "POST",
                headers,
                body: JSON.stringify(settingsForm),
            });
            if (res.status === 401) {
                logout();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setShowSettings(false);
            }
        } catch {
            alert("Failed to save settings.");
        }
        setSaving(false);
    };

    // Compute live BMI/TDEE from form values
    const liveBmi = () => {
        const h = parseFloat(form.height_cm);
        const w = parseFloat(form.weight_kg);
        if (h && w) return (w / ((h / 100) ** 2)).toFixed(1);
        return "—";
    };

    const liveTdee = () => {
        const h = parseFloat(form.height_cm);
        const w = parseFloat(form.weight_kg);
        const a = parseInt(form.age);
        if (!h || !w || !a || !form.gender) return "—";
        let bmr = form.gender === "male"
            ? 10 * w + 6.25 * h - 5 * a + 5
            : 10 * w + 6.25 * h - 5 * a - 161;
        const mult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extra: 1.9 };
        return Math.round(bmr * (mult[form.activity_level] || 1.2)).toString();
    };

    const liveCalTarget = () => {
        const tdee = parseInt(liveTdee());
        if (isNaN(tdee)) return "—";
        const adj: Record<string, number> = { lose: -500, maintain: 0, gain: 500 };
        return (tdee + (adj[form.goal] || 0)).toString();
    };

    const bmiCategory = (val: string) => {
        const n = parseFloat(val);
        if (isNaN(n)) return { label: "", color: "text-on-surface-variant" };
        if (n < 18.5) return { label: "Underweight", color: "text-blue-500" };
        if (n < 25) return { label: "Normal", color: "text-green-600" };
        if (n < 30) return { label: "Overweight", color: "text-orange-500" };
        return { label: "Obese", color: "text-red-500" };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const bmiVal = liveBmi();
    const tdeeVal = liveTdee();
    const calTarget = liveCalTarget();
    const calNum = parseInt(calTarget);

    return (
        <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-2 border-primary/20">
                        {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={20} className="text-primary" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-primary line-clamp-1">{profile?.full_name || "Vitality Journal"}</h1>
                    </div>
                </div>
                <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors">
                    <Settings size={16} className="text-on-surface-variant" />
                </button>
            </div>

            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        <h2 className="text-2xl font-display font-bold text-primary mb-4">Settings</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-body text-on-surface-variant uppercase tracking-wider mb-1">First Name</label>
                                <input type="text" value={settingsForm.first_name} onChange={e => setSettingsForm({ ...settingsForm, first_name: e.target.value })} className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary/50 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-body text-on-surface-variant uppercase tracking-wider mb-1">Last Name</label>
                                <input type="text" value={settingsForm.last_name} onChange={e => setSettingsForm({ ...settingsForm, last_name: e.target.value })} className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary/50 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-body text-on-surface-variant uppercase tracking-wider mb-1">Avatar Image URL</label>
                                <input type="url" placeholder="https://" value={settingsForm.avatar_url} onChange={e => setSettingsForm({ ...settingsForm, avatar_url: e.target.value })} className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary/50 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-body text-on-surface-variant uppercase tracking-wider mb-1">New Password (optional)</label>
                                <input type="password" placeholder="••••••••" value={settingsForm.password} onChange={e => setSettingsForm({ ...settingsForm, password: e.target.value })} className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary/50 focus:outline-none" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold hover:bg-surface-container-high transition-colors">Cancel</button>
                            <button onClick={saveSettings} disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold opacity-90 hover:opacity-100 transition-opacity">
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-on-surface mb-1">Your Profile</h2>
            <p className="text-on-surface-variant font-body text-sm mb-5">Fine-tune your health trajectory</p>

            {/* Scan Barcode Button */}
            <button
                onClick={() => router.push("/scan")}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-display font-semibold rounded-2xl shadow-md flex items-center justify-center gap-2 mb-6 active:scale-[0.98] transition-transform"
            >
                <ScanBarcode size={20} /> Scan Barcode
            </button>

            {/* Current Stats */}
            <div className="flex items-center justify-between mb-3">
                <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold">Current Stats</p>
                {profile?.onboarding_complete && (
                    <p className="font-body text-on-surface-variant text-xs">UPDATED RECENTLY</p>
                )}
            </div>

            {/* Height / Weight Row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
                    <label className="text-xs font-body text-on-surface-variant uppercase tracking-wider block mb-1">Height</label>
                    <div className="flex items-baseline gap-1">
                        <input
                            type="number"
                            value={form.height_cm}
                            onChange={(e) => update("height_cm", e.target.value)}
                            placeholder="178"
                            className="w-full text-2xl sm:text-3xl font-display font-bold text-on-surface bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-sm text-on-surface-variant font-body">cm</span>
                    </div>
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
                    <label className="text-xs font-body text-on-surface-variant uppercase tracking-wider block mb-1">Weight</label>
                    <div className="flex items-baseline gap-1">
                        <input
                            type="number"
                            value={form.weight_kg}
                            onChange={(e) => update("weight_kg", e.target.value)}
                            placeholder="74.5"
                            step="0.1"
                            className="w-full text-2xl sm:text-3xl font-display font-bold text-on-surface bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-sm text-on-surface-variant font-body">kg</span>
                    </div>
                </div>
            </div>

            {/* Age / BMI Row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-primary-container/30 rounded-2xl p-4 shadow-sm">
                    <label className="text-xs font-body text-on-surface-variant uppercase tracking-wider block mb-1">Age</label>
                    <div className="flex items-baseline gap-1">
                        <input
                            type="number"
                            value={form.age}
                            onChange={(e) => update("age", e.target.value)}
                            placeholder="28"
                            className="w-full text-2xl sm:text-3xl font-display font-bold text-on-surface bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-sm text-on-surface-variant font-body">yrs</span>
                    </div>
                </div>
                <div className="bg-primary-container/30 rounded-2xl p-4 shadow-sm">
                    <label className="text-xs font-body text-on-surface-variant uppercase tracking-wider block mb-1">BMI <span className="normal-case">(Calculated)</span></label>
                    <p className="text-2xl sm:text-3xl font-display font-bold text-on-surface">{bmiVal}</p>
                    <p className={`text-xs font-body ${bmiCategory(bmiVal).color}`}>{bmiCategory(bmiVal).label}</p>
                </div>
            </div>

            {/* TDEE */}
            <div className="bg-primary-container/30 rounded-2xl p-4 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <Flame size={16} className="text-primary" />
                    <label className="text-xs font-body text-on-surface-variant uppercase tracking-wider">TDEE <span className="normal-case">(Calculated)</span></label>
                </div>
                <div className="flex items-baseline gap-1">
                    <p className="text-2xl sm:text-3xl font-display font-bold text-on-surface">{tdeeVal}</p>
                    <span className="text-sm text-on-surface-variant font-body">kcal</span>
                </div>
            </div>

            {/* Gender Toggle */}
            <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold mb-3">Gender</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
                {[{ v: "male", l: "Male" }, { v: "female", l: "Female" }].map((o) => (
                    <button key={o.v} onClick={() => update("gender", o.v)}
                        className={`p-3 rounded-2xl font-body text-sm font-semibold text-center transition-all ${form.gender === o.v ? "bg-primary text-on-primary shadow-md" : "bg-surface-container-lowest text-on-surface border border-outline-variant/15"}`}>
                        {o.l}
                    </button>
                ))}
            </div>

            {/* Your Goal */}
            <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold mb-3">Your Goal</p>
            <div className="space-y-2 mb-6">
                {[
                    { v: "lose", l: "Weight Loss", d: "Fat reduction & toning focus" },
                    { v: "maintain", l: "Maintain", d: "Sustainability & balanced energy" },
                    { v: "gain", l: "Muscle Gain", d: "Hypertrophy & strength focus" },
                ].map((o) => (
                    <button key={o.v} onClick={() => update("goal", o.v)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all ${form.goal === o.v ? "bg-surface-container-lowest shadow-md border-2 border-primary/30" : "bg-surface-container-lowest border border-outline-variant/10"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.goal === o.v ? "border-primary" : "border-outline-variant"}`}>
                            {form.goal === o.v && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <div>
                            <p className="font-display font-semibold text-sm text-on-surface">{o.l}</p>
                            <p className="text-xs text-on-surface-variant font-body">{o.d}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Activity Level */}
            <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold mb-3">Activity Level</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {[
                    { v: "sedentary", l: "Sedentary" },
                    { v: "light", l: "Light" },
                    { v: "moderate", l: "Moderate" },
                    { v: "active", l: "Active" },
                    { v: "extra", l: "Extra" },
                ].map((o) => (
                    <button key={o.v} onClick={() => update("activity_level", o.v)}
                        className={`p-3 rounded-2xl font-body text-xs font-semibold text-center transition-all ${form.activity_level === o.v ? "bg-primary text-on-primary shadow-md" : "bg-surface-container-lowest text-on-surface border border-outline-variant/15"}`}>
                        {o.l}
                    </button>
                ))}
            </div>

            {/* Daily Targets */}
            {!isNaN(calNum) && (
                <>
                    <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold mb-3">Daily Targets</p>
                    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-body text-on-surface font-medium">Daily Calories</p>
                            <div className="bg-primary-container/40 px-3 py-1 rounded-lg">
                                <span className="font-display font-bold text-primary">{calTarget}</span>
                                <span className="text-xs text-on-surface-variant ml-1">kcal</span>
                            </div>
                        </div>
                        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: "0%" }} />
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        {[
                            { label: "Protein", value: Math.round(calNum * 0.3 / 4), unit: "g" },
                            { label: "Carbs", value: Math.round(calNum * 0.4 / 4), unit: "g" },
                            { label: "Fats", value: Math.round(calNum * 0.3 / 9), unit: "g" },
                        ].map((m) => (
                            <div key={m.label} className="flex items-center justify-between py-2">
                                <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold">{m.label}</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-xl font-display font-bold text-on-surface">{m.value}</p>
                                    <span className="text-sm text-on-surface-variant font-body">{m.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Save Button */}
            <button
                onClick={saveProfile}
                disabled={saving}
                className={`w-full py-4 font-display font-semibold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all mb-4 ${saved ? "bg-green-600 text-white" : "bg-gradient-to-r from-primary to-primary-container text-on-primary"}`}
            >
                <Save size={20} />
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save Profile Changes"}
            </button>
        </div>
    );
}
