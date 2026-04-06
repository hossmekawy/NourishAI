"use client";

import { useState } from "react";
import { X, Pencil, Trash2, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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

interface Props {
    meal: MealData | null;
    onClose: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
}

export default function MealDetailModal({ meal, onClose, onUpdated, onDeleted }: Props) {
    const { token, logout } = useAuth();
    const [editing, setEditing] = useState(false);
    const [items, setItems] = useState<MealItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState("");

    const headers = (): Record<string, string> => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const startEditing = () => {
        if (meal) setItems(meal.meal_items.map((i) => ({ ...i })));
        setEditing(true);
    };

    const updateItem = (idx: number, field: keyof MealItem, val: string) => {
        const updated = [...items];
        updated[idx] = { ...updated[idx], [field]: parseFloat(val) || 0 };
        setItems(updated);
    };

    const handleSave = async () => {
        if (!meal) return;
        setSaving(true);
        setError("");
        const totalCalories = items.reduce((s, i) => s + i.calories, 0);
        const totalProtein = items.reduce((s, i) => s + i.protein, 0);
        const totalCarbs = items.reduce((s, i) => s + i.carbs, 0);
        const totalFat = items.reduce((s, i) => s + i.fat, 0);
        try {
            const res = await fetch(`http://localhost:8000/api/meals/${meal.id}/`, {
                method: "PUT",
                headers: headers(),
                body: JSON.stringify({
                    name: meal.name,
                    emoji: meal.emoji,
                    calories: totalCalories,
                    protein: totalProtein,
                    carbs: totalCarbs,
                    fat: totalFat,
                    meal_items: items,
                }),
            });
            if (res.status === 401) { logout(); return; }
            if (res.ok) {
                setEditing(false);
                onUpdated();
                onClose();
            }
        } catch {
            setError("Failed to save changes.");
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!meal) return;
        setDeleting(true);
        try {
            const res = await fetch(`http://localhost:8000/api/meals/${meal.id}/`, {
                method: "DELETE",
                headers: headers(),
            });
            if (res.status === 401) { logout(); return; }
            if (res.ok || res.status === 204) {
                onDeleted();
                onClose();
            }
        } catch {
            setError("Failed to delete meal.");
        }
        setDeleting(false);
    };

    if (!meal) return null;

    const displayItems = editing ? items : meal.meal_items;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-surface w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl pb-8">
                {/* Header */}
                <div className="sticky top-0 bg-surface z-10 px-5 pt-5 pb-3 flex items-center justify-between border-b border-outline-variant/10">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{meal.emoji}</span>
                        <div>
                            <h2 className="text-lg font-display font-bold text-on-surface">{meal.name}</h2>
                            <p className="text-xs font-body text-on-surface-variant">
                                {meal.created_at ? new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
                    )}

                    {/* Total Macros Card */}
                    <div className="bg-primary-container/20 rounded-2xl p-4">
                        <p className="text-center text-3xl font-display font-bold text-primary">
                            {Math.round(editing ? items.reduce((s, i) => s + i.calories, 0) : meal.calories)}
                            <span className="text-sm font-body ml-1">kcal</span>
                        </p>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                            {[
                                { l: "Protein", v: Math.round(editing ? items.reduce((s, i) => s + i.protein, 0) : meal.protein), e: "🥩" },
                                { l: "Carbs", v: Math.round(editing ? items.reduce((s, i) => s + i.carbs, 0) : meal.carbs), e: "🌾" },
                                { l: "Fat", v: Math.round(editing ? items.reduce((s, i) => s + i.fat, 0) : meal.fat), e: "🧈" },
                            ].map((m) => (
                                <div key={m.l} className="text-center">
                                    <p className="text-lg font-display font-bold text-on-surface">{m.v}g</p>
                                    <p className="text-xs text-on-surface-variant">{m.e} {m.l}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                            Items ({displayItems.length})
                        </p>
                        <div className="space-y-2">
                            {displayItems.map((item, idx) => (
                                <div key={idx} className="bg-surface-container-lowest rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{item.emoji}</span>
                                            <p className="text-sm font-body font-medium text-on-surface">{item.name}</p>
                                        </div>
                                        {!editing && (
                                            <p className="font-display font-bold text-primary text-sm">{Math.round(item.calories)} kcal</p>
                                        )}
                                    </div>
                                    {editing ? (
                                        <div className="grid grid-cols-5 gap-1.5 mt-2">
                                            {[
                                                { key: "quantity" as const, label: "Qty (g)" },
                                                { key: "calories" as const, label: "Cal" },
                                                { key: "protein" as const, label: "P (g)" },
                                                { key: "carbs" as const, label: "C (g)" },
                                                { key: "fat" as const, label: "F (g)" },
                                            ].map(({ key, label }) => (
                                                <div key={key}>
                                                    <label className="text-[9px] text-on-surface-variant font-body block mb-0.5">{label}</label>
                                                    <input
                                                        type="number"
                                                        value={item[key]}
                                                        onChange={(e) => updateItem(idx, key, e.target.value)}
                                                        className="w-full text-center bg-primary-container/15 px-1 py-1.5 rounded-lg text-xs font-display font-bold text-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-on-surface-variant mt-0.5">
                                            {item.quantity}g · P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {editing ? (
                            <>
                                <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save
                                </button>
                            </>
                        ) : confirmDelete ? (
                            <>
                                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold">
                                    Cancel
                                </button>
                                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-body font-semibold flex items-center justify-center gap-2">
                                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    Confirm Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setConfirmDelete(true)} className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-body font-semibold flex items-center justify-center gap-2 border border-red-200">
                                    <Trash2 size={16} /> Delete
                                </button>
                                <button onClick={startEditing} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold flex items-center justify-center gap-2">
                                    <Pencil size={16} /> Edit
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
