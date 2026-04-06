"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Camera, Loader2, Scale, TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface WeightEntry {
    id: number;
    weight_kg: number;
    body_fat_pct: number | null;
    muscle_mass_kg: number | null;
    bmi: number | null;
    date: string;
    source: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function WeeklyCheckinModal({ open, onClose, onSaved }: Props) {
    const { token, logout } = useAuth();
    const [weight, setWeight] = useState("");
    const [bodyFat, setBodyFat] = useState("");
    const [muscleMass, setMuscleMass] = useState("");
    const [bmi, setBmi] = useState("");
    const [history, setHistory] = useState<WeightEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const headers = (): Record<string, string> => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/weight/", { headers: headers() });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            setHistory(data);
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => {
        if (open && token) fetchHistory();
    }, [open, token]);

    const handleSave = async () => {
        if (!weight) { setError("Enter your weight."); return; }
        setSaving(true);
        setError("");
        try {
            const res = await fetch("http://localhost:8000/api/weight/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    weight_kg: parseFloat(weight),
                    body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
                    muscle_mass_kg: muscleMass ? parseFloat(muscleMass) : null,
                    bmi: bmi ? parseFloat(bmi) : null,
                    source: "manual",
                    date: new Date().toISOString().split("T")[0],
                }),
            });
            if (res.status === 401) { logout(); return; }
            if (res.ok) {
                onSaved();
                setWeight(""); setBodyFat(""); setMuscleMass(""); setBmi("");
                fetchHistory();
            }
        } catch {
            setError("Failed to save.");
        }
        setSaving(false);
    };

    // InBody OCR upload
    const handleInBodyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setOcrLoading(true);
        setError("");
        try {
            const base64 = await fileToBase64(file);
            const res = await fetch("http://localhost:8000/api/ai/ocr-inbody/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ image: base64, mime_type: file.type }),
            });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                if (data.weight_kg) setWeight(String(data.weight_kg));
                if (data.body_fat_pct) setBodyFat(String(data.body_fat_pct));
                if (data.muscle_mass_kg) setMuscleMass(String(data.muscle_mass_kg));
                if (data.bmi) setBmi(String(data.bmi));
            }
        } catch {
            setError("Failed to process InBody report.");
        }
        setOcrLoading(false);
    };

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const getDelta = (idx: number): { val: number; label: string; icon: typeof TrendingDown } | null => {
        if (idx >= history.length - 1) return null;
        const delta = history[idx].weight_kg - history[idx + 1].weight_kg;
        if (Math.abs(delta) < 0.05) return { val: 0, label: "Stable", icon: Minus };
        return delta < 0
            ? { val: Math.abs(delta), label: `${Math.abs(delta).toFixed(1)} kg↓`, icon: TrendingDown }
            : { val: delta, label: `+${delta.toFixed(1)} kg↑`, icon: TrendingUp };
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-surface w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl pb-8">
                {/* Header */}
                <div className="sticky top-0 bg-surface z-10 px-5 pt-5 pb-3 flex items-center justify-between border-b border-outline-variant/10">
                    <h2 className="text-xl font-display font-bold text-on-surface flex items-center gap-2">
                        <Scale size={20} className="text-primary" /> Weekly Check-in
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
                    )}

                    {/* Info Banner */}
                    <div className="bg-primary-container/30 rounded-2xl p-4 flex items-start gap-3">
                        <span className="text-2xl">🔔</span>
                        <p className="text-sm font-body text-on-surface">
                            Time for your weekly check-in! Update your weight and InBody scan to stay on track.
                        </p>
                    </div>

                    {/* Manual Weight Entry */}
                    <div className="bg-surface-container-lowest rounded-2xl p-4">
                        <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Manual Entry</p>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-display font-bold text-primary">Current Weight</h3>
                            <span className="text-sm font-body text-on-surface-variant">kg</span>
                        </div>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="00.0"
                            className="w-full text-4xl font-display font-bold text-primary bg-transparent text-center focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none py-2"
                        />
                    </div>

                    {/* InBody Upload */}
                    <div className="bg-surface-container-lowest rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-display font-bold text-on-surface">Upload InBody Report</h3>
                            <span className="text-xl">📄</span>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                            <Sparkles size={12} className="text-primary" />
                            <p className="text-[10px] font-body text-primary font-semibold uppercase tracking-wider">AI OCR Auto-Sync Enabled</p>
                        </div>

                        {ocrLoading ? (
                            <div className="flex items-center justify-center py-6 gap-2">
                                <Loader2 size={20} className="text-primary animate-spin" />
                                <p className="text-sm text-on-surface-variant font-body">Extracting data...</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <button onClick={() => fileRef.current?.click()}
                                    className="w-full py-3 rounded-xl bg-surface-container-low flex items-center justify-center gap-2 font-body font-semibold text-on-surface text-sm active:scale-[0.98] transition-transform">
                                    <Upload size={16} /> Upload PDF/Photo
                                </button>
                                <button onClick={() => fileRef.current?.click()}
                                    className="w-full py-3 rounded-xl bg-primary text-on-primary flex items-center justify-center gap-2 font-body font-semibold text-sm">
                                    <Camera size={16} /> Scan with Camera
                                </button>
                            </div>
                        )}
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleInBodyUpload} />
                        <p className="text-[9px] text-on-surface-variant text-center mt-2 uppercase tracking-wider">
                            AI will automatically sync your BMI, Body Fat %, and Muscle Mass
                        </p>
                    </div>

                    {/* Extra fields (shown when OCR fills them or manually) */}
                    {(bodyFat || muscleMass || bmi) && (
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: "Body Fat %", val: bodyFat, set: setBodyFat },
                                { label: "Muscle Mass (kg)", val: muscleMass, set: setMuscleMass },
                                { label: "BMI", val: bmi, set: setBmi },
                            ].map((f) => (
                                <div key={f.label} className="bg-surface-container-lowest rounded-xl p-3 text-center">
                                    <label className="text-[9px] text-on-surface-variant uppercase tracking-wider font-body block mb-1">{f.label}</label>
                                    <input
                                        type="number"
                                        value={f.val}
                                        onChange={(e) => f.set(e.target.value)}
                                        className="w-full text-center text-lg font-display font-bold text-primary bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recent Progress */}
                    {history.length > 0 && (
                        <div>
                            <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold mb-3">Recent Progress</p>
                            <div className="space-y-2">
                                {history.slice(0, 5).map((entry, idx) => {
                                    const delta = getDelta(idx);
                                    return (
                                        <div key={entry.id} className="bg-surface-container-lowest rounded-xl p-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-body text-on-surface-variant uppercase tracking-wider">
                                                    {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </p>
                                                <p className="text-lg font-display font-bold text-on-surface flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                                    {entry.weight_kg} kg
                                                </p>
                                            </div>
                                            {delta && (
                                                <p className={`text-xs font-body font-semibold flex items-center gap-1 ${delta.val === 0 ? "text-on-surface-variant" : delta.label.includes("↓") ? "text-green-600" : "text-red-500"}`}>
                                                    {delta.label}
                                                    <delta.icon size={14} />
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <button onClick={handleSave} disabled={saving || !weight}
                        className="w-full py-4 rounded-2xl bg-primary text-on-primary font-body font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform">
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Scale size={18} />}
                        Save Update
                    </button>
                </div>
            </div>
        </div>
    );
}
