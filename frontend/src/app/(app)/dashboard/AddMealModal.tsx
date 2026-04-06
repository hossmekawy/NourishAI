"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Mic, MicOff, Keyboard, Upload, Trash2, Plus, Sparkles, Loader2, PenLine } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface FoodItem {
    name: string;
    emoji: string;
    estimated_grams: number;
    quantity?: number;
}

interface NutritionResult {
    items: Array<{
        name: string;
        emoji: string;
        quantity: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    }>;
    total: { calories: number; protein: number; carbs: number; fat: number };
    meal_name: string;
    meal_emoji: string;
}

interface ManualItem {
    name: string;
    quantity: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
}

type InputMode = "photo" | "voice" | "text" | "manual";
type Step = "input" | "detected" | "nutrition" | "saving";

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const FOOD_EMOJIS: Record<string, string> = {
    chicken: "🍗", rice: "🍚", bread: "🍞", salad: "🥗", egg: "🥚", beef: "🥩",
    fish: "🐟", pasta: "🍝", pizza: "🍕", burger: "🍔", fries: "🍟", soup: "🍲",
    fruit: "🍎", milk: "🥛", cheese: "🧀", yogurt: "🥛", coffee: "☕", tea: "🍵",
    cake: "🍰", chocolate: "🍫", sandwich: "🥪", taco: "🌮", sushi: "🍣",
    koshari: "🍜", koshary: "🍜", foul: "🫘", falafel: "🧆", mahshi: "🫑",
    molokhia: "🥬", fiteer: "🫓", shawarma: "🌯", kebab: "🍢",
    كشري: "🍜", فول: "🫘", طعمية: "🧆", محشي: "🫑", ملوخية: "🥬", فتة: "🍲",
    شاورما: "🌯", كباب: "🍢", أرز: "🍚", خبز: "🍞",
};

function getSmartEmoji(name: string): string {
    const lower = name.toLowerCase();
    for (const [keyword, emoji] of Object.entries(FOOD_EMOJIS)) {
        if (lower.includes(keyword)) return emoji;
    }
    return "🍽️";
}

export default function AddMealModal({ open, onClose, onSaved }: Props) {
    const { token, logout } = useAuth();
    const [mode, setMode] = useState<InputMode>("photo");
    const [step, setStep] = useState<Step>("input");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Detected food items (editable quantities)
    const [items, setItems] = useState<FoodItem[]>([]);
    const [nutrition, setNutrition] = useState<NutritionResult | null>(null);

    // Text input
    const [textInput, setTextInput] = useState("");

    // Voice (MediaRecorder)
    const [recording, setRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Camera / upload
    const fileRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Manual entry
    const [manualItems, setManualItems] = useState<ManualItem[]>([
        { name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" },
    ]);

    const headers = (): Record<string, string> => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const reset = () => {
        setStep("input");
        setItems([]);
        setNutrition(null);
        setError("");
        setTextInput("");
        setTranscript("");
        setRecording(false);
        setManualItems([{ name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" }]);
        stopCamera();
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // ─── Photo Mode ──────────────────────────────────────────────────────
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const base64 = await fileToBase64(file);
        await detectFromImage(base64, file.type);
    };

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch {
            setError("Camera access denied.");
            setShowCamera(false);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        stopCamera();
        detectFromImage(dataUrl, "image/jpeg");
    };

    const stopCamera = () => {
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
        setShowCamera(false);
    };

    const detectFromImage = async (imageData: string, mimeType: string) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("http://localhost:8000/api/ai/detect-food/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ image: imageData, mime_type: mimeType }),
            });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else if (data.items && data.items.length > 0) {
                setItems(data.items.map((i: FoodItem) => ({ ...i, quantity: i.estimated_grams })));
                setStep("detected");
            } else {
                setError("No food detected. Try uploading a clearer photo or use text/manual mode.");
            }
        } catch {
            setError("Failed to analyze image. Check your connection.");
        }
        setLoading(false);
    };

    // ─── Voice Mode (MediaRecorder → Gemini) ─────────────────────────────
    const startRecording = async () => {
        setError("");
        setTranscript("");
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm" });
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                // Stop mic tracks
                mediaStream.getTracks().forEach((t) => t.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                await processVoice(audioBlob);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setRecording(true);
        } catch {
            setError("Microphone access denied. Allow mic permission and try again.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setRecording(false);
    };

    const processVoice = async (audioBlob: Blob) => {
        setLoading(true);
        setError("");
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });

            const res = await fetch("http://localhost:8000/api/ai/voice-to-food/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ audio: base64, mime_type: "audio/webm" }),
            });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                if (data.transcript) setTranscript(data.transcript);
                if (data.items && data.items.length > 0) {
                    setItems(data.items.map((i: FoodItem) => ({ ...i, quantity: i.estimated_grams })));
                    setStep("detected");
                } else {
                    setError("Could not identify food from audio. Try speaking more clearly or use text entry.");
                }
            }
        } catch {
            setError("Failed to process voice. Try text entry instead.");
        }
        setLoading(false);
    };

    // ─── Text Mode ───────────────────────────────────────────────────────
    const submitText = () => {
        if (textInput.trim()) detectFromText(textInput.trim());
    };

    const detectFromText = async (text: string) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("http://localhost:8000/api/ai/text-to-food/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ text }),
            });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else if (data.items && data.items.length > 0) {
                setItems(data.items.map((i: FoodItem) => ({ ...i, quantity: i.estimated_grams })));
                setStep("detected");
            } else {
                setError("Could not identify food. Try the Manual tab to enter nutrients directly.");
            }
        } catch {
            setError("Failed to process text. Try manual entry instead.");
        }
        setLoading(false);
    };

    // ─── Manual Mode ─────────────────────────────────────────────────────
    const updateManualItem = (idx: number, field: keyof ManualItem, val: string) => {
        const updated = [...manualItems];
        updated[idx] = { ...updated[idx], [field]: val };
        setManualItems(updated);
    };

    const addManualRow = () => {
        setManualItems([...manualItems, { name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" }]);
    };

    const removeManualRow = (idx: number) => {
        if (manualItems.length === 1) return;
        setManualItems(manualItems.filter((_, i) => i !== idx));
    };

    const submitManual = async () => {
        const validItems = manualItems.filter((i) => i.name.trim());
        if (validItems.length === 0) {
            setError("Enter at least one food item name.");
            return;
        }

        const totalCals = validItems.reduce((s, i) => s + (parseFloat(i.calories) || 0), 0);
        const totalProtein = validItems.reduce((s, i) => s + (parseFloat(i.protein) || 0), 0);
        const totalCarbs = validItems.reduce((s, i) => s + (parseFloat(i.carbs) || 0), 0);
        const totalFat = validItems.reduce((s, i) => s + (parseFloat(i.fat) || 0), 0);

        const mealName = validItems.length === 1 ? validItems[0].name : validItems.map((i) => i.name).join(" + ");
        const mealEmoji = getSmartEmoji(mealName);

        setStep("saving");
        try {
            const res = await fetch("http://localhost:8000/api/meals/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    name: mealName,
                    emoji: mealEmoji,
                    calories: totalCals,
                    protein: totalProtein,
                    carbs: totalCarbs,
                    fat: totalFat,
                    meal_items: validItems.map((i) => ({
                        name: i.name,
                        emoji: getSmartEmoji(i.name),
                        quantity: parseFloat(i.quantity) || 0,
                        calories: parseFloat(i.calories) || 0,
                        protein: parseFloat(i.protein) || 0,
                        carbs: parseFloat(i.carbs) || 0,
                        fat: parseFloat(i.fat) || 0,
                    })),
                }),
            });
            if (res.status === 401) { logout(); return; }
            if (res.ok) {
                onSaved();
                handleClose();
            } else {
                setError("Failed to save meal.");
                setStep("input");
            }
        } catch {
            setError("Network error saving meal.");
            setStep("input");
        }
    };

    // ─── Calculate Nutrition (AI) ────────────────────────────────────────
    const calculateNutrition = async () => {
        setLoading(true);
        setError("");
        try {
            const payload = items.map((i) => ({
                name: i.name,
                quantity_grams: i.quantity || i.estimated_grams,
            }));
            const res = await fetch("http://localhost:8000/api/ai/calculate-nutrition/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ items: payload }),
            });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                setNutrition(data);
                setStep("nutrition");
            }
        } catch {
            setError("Failed to calculate nutrition. You can save with estimated values.");
        }
        setLoading(false);
    };

    // ─── Save Meal (from AI result) ──────────────────────────────────────
    const saveMeal = async () => {
        if (!nutrition) return;
        setStep("saving");
        try {
            const res = await fetch("http://localhost:8000/api/meals/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    name: nutrition.meal_name,
                    emoji: nutrition.meal_emoji,
                    calories: nutrition.total.calories,
                    protein: nutrition.total.protein,
                    carbs: nutrition.total.carbs,
                    fat: nutrition.total.fat,
                    meal_items: nutrition.items,
                }),
            });
            if (res.status === 401) { logout(); return; }
            if (res.ok) {
                onSaved();
                handleClose();
            }
        } catch {
            setError("Failed to save meal.");
            setStep("nutrition");
        }
    };

    // Update item quantity
    const updateQuantity = (idx: number, val: string) => {
        const updated = [...items];
        updated[idx] = { ...updated[idx], quantity: parseInt(val) || 0 };
        setItems(updated);
    };

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    // Cleanup
    useEffect(() => {
        return () => {
            stream?.getTracks().forEach((t) => t.stop());
            mediaRecorderRef.current?.stop();
        };
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-surface w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl mb-0 sm:mb-0">
                {/* Header */}
                <div className="sticky top-0 bg-surface z-10 px-5 pt-5 pb-3 flex items-center justify-between border-b border-outline-variant/10">
                    <h2 className="text-xl font-display font-bold text-primary flex items-center gap-2">
                        <Sparkles size={20} /> Log Meal
                    </h2>
                    <button onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 pb-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{error}</div>
                    )}

                    {/* ─── Step: Input ─────────────────────────────────────── */}
                    {step === "input" && !loading && (
                        <>
                            {/* Mode Tabs */}
                            <div className="grid grid-cols-4 gap-1.5 mb-5">
                                {[
                                    { m: "photo" as InputMode, icon: Camera, label: "Photo" },
                                    { m: "voice" as InputMode, icon: Mic, label: "Voice" },
                                    { m: "text" as InputMode, icon: Keyboard, label: "AI Text" },
                                    { m: "manual" as InputMode, icon: PenLine, label: "Manual" },
                                ].map(({ m, icon: Icon, label }) => (
                                    <button key={m} onClick={() => { setMode(m); setError(""); }}
                                        className={`py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all text-[10px] font-body font-semibold ${mode === m ? "bg-primary text-on-primary shadow-md" : "bg-surface-container-lowest text-on-surface border border-outline-variant/15"}`}>
                                        <Icon size={18} />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Photo Mode */}
                            {mode === "photo" && (
                                <div className="space-y-3">
                                    {showCamera ? (
                                        <div className="relative rounded-2xl overflow-hidden bg-black">
                                            <video ref={videoRef} autoPlay playsInline className="w-full" />
                                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                                                <button onClick={capturePhoto} className="px-6 py-2 bg-primary text-on-primary rounded-full font-body font-semibold shadow-lg">
                                                    📸 Capture
                                                </button>
                                                <button onClick={stopCamera} className="px-4 py-2 bg-red-500 text-white rounded-full">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={startCamera}
                                                className="py-8 rounded-2xl bg-primary-container/30 flex flex-col items-center gap-2 text-primary font-body font-semibold border-2 border-dashed border-primary/30 active:scale-[0.98] transition-transform">
                                                <Camera size={28} />
                                                Live Camera
                                            </button>
                                            <button onClick={() => fileRef.current?.click()}
                                                className="py-8 rounded-2xl bg-primary-container/30 flex flex-col items-center gap-2 text-primary font-body font-semibold border-2 border-dashed border-primary/30 active:scale-[0.98] transition-transform">
                                                <Upload size={28} />
                                                Upload Image
                                            </button>
                                        </div>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </div>
                            )}

                            {/* Voice Mode — record audio → send to Gemini */}
                            {mode === "voice" && (
                                <div className="text-center space-y-4">
                                    <p className="text-sm font-body text-on-surface-variant">
                                        Record what you ate — supports Arabic & English
                                    </p>
                                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all cursor-pointer ${recording ? "bg-red-500 animate-pulse scale-110" : "bg-primary"}`}
                                        onClick={recording ? stopRecording : startRecording}>
                                        {recording ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
                                    </div>
                                    <p className="text-xs text-on-surface-variant">{recording ? "Recording... tap to stop & process" : "Tap to start recording"}</p>
                                    {transcript && (
                                        <div className="bg-surface-container-lowest rounded-xl p-3 text-on-surface font-body text-sm text-right" dir="auto">
                                            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 text-left">Transcript</p>
                                            {transcript}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Text Mode */}
                            {mode === "text" && (
                                <div className="space-y-3">
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder={"Describe what you ate...\ne.g. كشري مع سلطة, grilled chicken with rice"}
                                        rows={3}
                                        dir="auto"
                                        className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary/50 focus:outline-none font-body text-on-surface resize-none"
                                    />
                                    <button onClick={submitText} disabled={!textInput.trim()}
                                        className="w-full py-3 bg-primary text-on-primary rounded-xl font-body font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                        <Sparkles size={16} /> Detect Food with AI
                                    </button>
                                </div>
                            )}

                            {/* Manual Mode */}
                            {mode === "manual" && (
                                <div className="space-y-3">
                                    <p className="text-xs font-body text-on-surface-variant">
                                        Enter food details manually — no AI needed
                                    </p>
                                    {manualItems.map((item, idx) => (
                                        <div key={idx} className="bg-surface-container-lowest rounded-xl p-3 space-y-2 border border-outline-variant/10">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={item.name}
                                                    onChange={(e) => updateManualItem(idx, "name", e.target.value)}
                                                    placeholder="Food name (e.g. كشري, chicken)"
                                                    dir="auto"
                                                    className="flex-1 bg-transparent font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
                                                />
                                                {manualItems.length > 1 && (
                                                    <button onClick={() => removeManualRow(idx)} className="text-red-400">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-5 gap-1.5">
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
                                                            onChange={(e) => updateManualItem(idx, key, e.target.value)}
                                                            className="w-full text-center bg-primary-container/10 px-1 py-1.5 rounded-lg text-xs font-display font-bold text-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={addManualRow}
                                        className="w-full py-2 rounded-xl border-2 border-dashed border-primary/30 text-primary font-body text-xs font-semibold flex items-center justify-center gap-1">
                                        <Plus size={14} /> Add Another Item
                                    </button>
                                    <button onClick={submitManual} disabled={!manualItems.some((i) => i.name.trim())}
                                        className="w-full py-3 bg-primary text-on-primary rounded-xl font-body font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                        <Plus size={16} /> Save Meal
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── Step: Detected Items (Edit Quantities) ─────────── */}
                    {step === "detected" && !loading && (
                        <div className="space-y-4">
                            <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold">
                                Detected {items.length} item{items.length > 1 ? "s" : ""} — adjust quantities
                            </p>
                            <div className="space-y-2">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-surface-container-lowest rounded-xl p-3">
                                        <span className="text-2xl">{item.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-on-surface text-sm font-medium truncate">{item.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(idx, e.target.value)}
                                                className="w-16 text-center bg-primary-container/20 px-2 py-1 rounded-lg text-sm font-display font-bold text-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="text-xs text-on-surface-variant">g</span>
                                        </div>
                                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={reset} className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold">
                                    Back
                                </button>
                                <button onClick={calculateNutrition} disabled={items.length === 0}
                                    className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Sparkles size={16} /> Calculate
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Step: Nutrition Results ─────────────────────────── */}
                    {step === "nutrition" && nutrition && !loading && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <span className="text-4xl">{nutrition.meal_emoji}</span>
                                <h3 className="text-lg font-display font-bold text-primary mt-2">{nutrition.meal_name}</h3>
                            </div>

                            {/* Total */}
                            <div className="bg-primary-container/20 rounded-2xl p-4">
                                <p className="text-center text-3xl font-display font-bold text-primary">{nutrition.total.calories}<span className="text-sm font-body ml-1">kcal</span></p>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    {[
                                        { l: "Protein", v: nutrition.total.protein, e: "🥩" },
                                        { l: "Carbs", v: nutrition.total.carbs, e: "🌾" },
                                        { l: "Fat", v: nutrition.total.fat, e: "🧈" },
                                    ].map((m) => (
                                        <div key={m.l} className="text-center">
                                            <p className="text-lg font-display font-bold text-on-surface">{m.v}g</p>
                                            <p className="text-xs text-on-surface-variant">{m.e} {m.l}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Individual Items */}
                            <div className="space-y-2">
                                {nutrition.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{item.emoji}</span>
                                            <div>
                                                <p className="text-sm font-body font-medium text-on-surface">{item.name}</p>
                                                <p className="text-xs text-on-surface-variant">{item.quantity}g</p>
                                            </div>
                                        </div>
                                        <p className="font-display font-bold text-primary text-sm">{item.calories} kcal</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep("detected")} className="flex-1 py-3 rounded-xl bg-surface-container-low font-body text-on-surface font-semibold">
                                    Edit Quantities
                                </button>
                                <button onClick={saveMeal} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body font-semibold flex items-center justify-center gap-2">
                                    <Plus size={16} /> Save Meal
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {(loading || step === "saving") && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 size={32} className="text-primary animate-spin" />
                            <p className="font-body text-on-surface-variant text-sm">
                                {step === "saving" ? "Saving meal..." : "AI is analyzing your food..."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
