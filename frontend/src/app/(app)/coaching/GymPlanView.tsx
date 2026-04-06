"use client";

import { useState } from "react";
import { RefreshCw, Check, Loader2, ChevronDown, ChevronUp, Play, Clock, Repeat } from "lucide-react";

interface Exercise {
    name: string;
    muscle_group: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    youtube_search: string;
    notes?: string;
}

interface TrainingDay {
    day_number: number;
    name: string;
    focus: string;
    estimated_duration_min: number;
    exercises: Exercise[];
}

interface GymPlanData {
    id: number;
    plan_data: {
        days: TrainingDay[];
        weekly_schedule?: string;
        tips?: string[];
    };
    days_per_week: number;
    session_minutes: number;
    fitness_level: string;
}

interface Props {
    plan: GymPlanData;
    token: string | null;
    onUpdated: () => void;
    onReset: () => void;
}

export default function GymPlanView({ plan, token, onUpdated, onReset }: Props) {
    const [activeDay, setActiveDay] = useState(0);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [swapping, setSwapping] = useState<number | null>(null);
    const [swapRequest, setSwapRequest] = useState("");
    const [tracking, setTracking] = useState<Record<string, boolean>>({});
    const [savingTrack, setSavingTrack] = useState(false);
    const [showVideo, setShowVideo] = useState<number | null>(null);

    const headers = (): Record<string, string> => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const days = plan.plan_data.days || [];
    const currentDay = days[activeDay];

    const handleSwap = async (exerciseIndex: number) => {
        setSwapping(exerciseIndex);
        try {
            const res = await fetch("http://localhost:8000/api/coaching/gym/swap/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    day_index: activeDay,
                    exercise_index: exerciseIndex,
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

    const toggleExercise = (key: string) => {
        setTracking((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const saveTracking = async () => {
        setSavingTrack(true);
        try {
            const allDone = currentDay?.exercises.every((_, i) => tracking[`${activeDay}-${i}`]);
            await fetch("http://localhost:8000/api/coaching/gym/track/", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    day_index: activeDay,
                    completed: allDone,
                    exercises_completed: tracking,
                }),
            });
        } catch { /* ignore */ }
        setSavingTrack(false);
    };

    const completedCount = currentDay?.exercises.filter((_, i) => tracking[`${activeDay}-${i}`]).length || 0;
    const totalExercises = currentDay?.exercises.length || 0;
    const dayAdherence = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

    const getYouTubeEmbedUrl = (searchQuery: string) => {
        return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`;
    };

    return (
        <div className="space-y-5">
            {/* Schedule Info */}
            {plan.plan_data.weekly_schedule && (
                <div className="bg-primary-container/20 rounded-2xl p-4 text-center">
                    <p className="text-sm font-body text-on-surface">{plan.plan_data.weekly_schedule}</p>
                    <p className="text-[10px] font-body text-on-surface-variant mt-1 capitalize">{plan.fitness_level} • {plan.session_minutes} min/session</p>
                </div>
            )}

            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {days.map((day, idx) => (
                    <button key={idx} onClick={() => { setActiveDay(idx); setExpanded(null); setShowVideo(null); }}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-body text-sm font-semibold transition-all whitespace-nowrap ${activeDay === idx ? "bg-primary text-on-primary shadow-lg" : "bg-surface-container-lowest text-on-surface border border-outline-variant/20"}`}>
                        Day {day.day_number}
                    </button>
                ))}
            </div>

            {currentDay && (
                <>
                    {/* Day Header */}
                    <div className="bg-surface-container-lowest rounded-2xl p-4">
                        <h3 className="font-display font-bold text-on-surface text-lg">{currentDay.name}</h3>
                        <p className="text-xs font-body text-on-surface-variant mt-0.5">
                            🎯 {currentDay.focus} • ⏱️ ~{currentDay.estimated_duration_min} min
                        </p>
                    </div>

                    {/* Day Progress */}
                    <div className="bg-surface-container-lowest rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-body font-semibold text-on-surface">Progress</p>
                            <span className="text-xs font-body text-primary font-bold">{dayAdherence}%</span>
                        </div>
                        <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${dayAdherence}%` }} />
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-1">{completedCount}/{totalExercises} exercises done</p>
                    </div>

                    {/* Exercises */}
                    <div className="space-y-2">
                        {currentDay.exercises.map((ex, idx) => {
                            const isExpanded = expanded === idx;
                            const isSwapping = swapping === idx;
                            const tKey = `${activeDay}-${idx}`;
                            const isVideoShown = showVideo === idx;

                            return (
                                <div key={idx} className="bg-surface-container-lowest rounded-2xl overflow-hidden">
                                    <div className="p-4 flex items-center gap-3">
                                        <button onClick={() => toggleExercise(tKey)}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${tracking[tKey] ? "bg-primary border-primary" : "border-outline-variant/30"}`}>
                                            {tracking[tKey] && <Check size={14} className="text-on-primary" />}
                                        </button>
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setExpanded(isExpanded ? null : idx); setShowVideo(null); }}>
                                            <p className={`font-display font-semibold text-sm truncate ${tracking[tKey] ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                                                {ex.name}
                                            </p>
                                            <p className="text-[10px] font-body text-on-surface-variant">
                                                {ex.muscle_group} • {ex.sets}×{ex.reps}
                                            </p>
                                        </div>
                                        <button onClick={() => { setExpanded(isExpanded ? null : idx); setShowVideo(null); }}
                                            className="text-on-surface-variant">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-3">
                                            <div className="border-t border-outline-variant/10 pt-3">
                                                <div className="grid grid-cols-3 gap-2 text-center bg-surface-container-low rounded-xl p-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Repeat size={14} className="text-primary" />
                                                        <p className="text-sm font-display font-bold text-on-surface">{ex.sets}×{ex.reps}</p>
                                                        <p className="text-[9px] text-on-surface-variant">Sets×Reps</p>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Clock size={14} className="text-primary" />
                                                        <p className="text-sm font-display font-bold text-on-surface">{ex.rest_seconds}s</p>
                                                        <p className="text-[9px] text-on-surface-variant">Rest</p>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-sm">💪</span>
                                                        <p className="text-sm font-display font-bold text-on-surface">{ex.muscle_group}</p>
                                                        <p className="text-[9px] text-on-surface-variant">Target</p>
                                                    </div>
                                                </div>
                                                {ex.notes && (
                                                    <p className="text-xs font-body text-on-surface-variant mt-2 italic">💡 {ex.notes}</p>
                                                )}
                                            </div>

                                            {/* YouTube Video */}
                                            <button onClick={() => setShowVideo(isVideoShown ? null : idx)}
                                                className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-600 font-body text-sm font-semibold flex items-center justify-center gap-2">
                                                <Play size={14} fill="currentColor" />
                                                {isVideoShown ? "Hide Video" : "Watch Tutorial"}
                                            </button>

                                            {isVideoShown && (
                                                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                                    <iframe
                                                        width="100%"
                                                        height="100%"
                                                        src={getYouTubeEmbedUrl(ex.youtube_search)}
                                                        title={ex.name}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                        className="border-0"
                                                    />
                                                </div>
                                            )}

                                            {/* Swap */}
                                            <div className="flex gap-2">
                                                <input value={swapRequest} onChange={(e) => setSwapRequest(e.target.value)}
                                                    placeholder="e.g. swap with dumbbell version..."
                                                    className="flex-1 text-xs bg-surface-container-low rounded-lg px-3 py-2 font-body focus:outline-none" />
                                                <button onClick={() => handleSwap(idx)} disabled={isSwapping}
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

                    {/* Tips */}
                    {plan.plan_data.tips && plan.plan_data.tips.length > 0 && (
                        <div className="bg-primary-container/15 rounded-2xl p-4">
                            <p className="text-xs font-body text-on-surface-variant uppercase tracking-wider font-semibold mb-2">💡 Pro Tips</p>
                            <ul className="space-y-1">
                                {plan.plan_data.tips.map((tip, i) => (
                                    <li key={i} className="text-xs font-body text-on-surface">• {tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
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
