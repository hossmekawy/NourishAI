"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, X, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface ProductData {
    found: boolean;
    name?: string;
    brand?: string;
    image?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    nutriscore?: string;
    serving_size?: string;
    ingredients?: string;
    error?: string;
}

export default function ScanPage() {
    const [scanning, setScanning] = useState(false);
    const [manualBarcode, setManualBarcode] = useState("");
    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const scannerRef = useRef<HTMLDivElement>(null);
    const html5QrCodeRef = useRef<unknown>(null);
    const { token, logout } = useAuth();
    const router = useRouter();

    const fetchProduct = async (barcode: string) => {
        setLoading(true);
        setError("");
        setProduct(null);
        try {
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`http://localhost:8000/api/barcode/${barcode}/`, { headers });
            if (res.status === 401) {
                logout();
                return;
            }
            const data = await res.json();
            if (data.found) {
                setProduct(data);
            } else {
                setError(data.error || "Product not found.");
            }
        } catch {
            setError("Network error connecting to server.");
        }
        setLoading(false);
    };

    const startScanner = async () => {
        setScanning(true);
        setProduct(null);
        setError("");

        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");

        setTimeout(async () => {
            if (!scannerRef.current) return;
            const scanner = new Html5Qrcode("scanner-container");
            html5QrCodeRef.current = scanner;

            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText: string) => {
                        scanner.stop().then(() => {
                            setScanning(false);
                            fetchProduct(decodedText);
                        });
                    },
                    () => { } // ignore scan failures
                );
            } catch (err) {
                console.error(err);
                setError("Camera access denied or not available.");
                setScanning(false);
            }
        }, 100);
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await (html5QrCodeRef.current as { stop: () => Promise<void> }).stop();
            } catch { /* ignore */ }
        }
        setScanning(false);
    };

    useEffect(() => {
        return () => { stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const nutriscoreColors: Record<string, string> = {
        a: "bg-green-600", b: "bg-lime-500", c: "bg-yellow-400", d: "bg-orange-500", e: "bg-red-500",
    };

    return (
        <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-display font-bold text-primary">Food Scanner</h1>
                <p className="text-on-surface-variant font-body mt-1">Scan a barcode or search manually</p>
            </div>

            {/* Manual Entry */}
            <div className="flex gap-3 mb-6">
                <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Enter barcode number..."
                    className="flex-1 bg-surface-container-low px-4 py-3 rounded-xl font-body text-on-surface focus:outline-none focus:bg-surface-container-lowest transition-colors"
                />
                <button
                    onClick={() => manualBarcode && fetchProduct(manualBarcode)}
                    className="px-4 py-3 bg-primary text-on-primary rounded-xl"
                >
                    <Search size={20} />
                </button>
            </div>

            {/* Camera Scanner */}
            {!scanning ? (
                <button
                    onClick={startScanner}
                    className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-display font-semibold rounded-2xl shadow-md flex items-center justify-center gap-3 mb-6"
                >
                    <Camera size={22} /> Open Camera Scanner
                </button>
            ) : (
                <div className="mb-6">
                    <div className="relative rounded-2xl overflow-hidden bg-black">
                        <div id="scanner-container" ref={scannerRef} className="w-full" />
                        <button onClick={stopScanner} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full">
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-center text-on-surface-variant font-body text-sm mt-3">Point camera at a barcode</p>
                </div>
            )}

            {loading && (
                <div className="text-center py-10">
                    <div className="inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-on-surface-variant font-body mt-3">Looking up product...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <p className="text-red-700 font-body">{error}</p>
                </div>
            )}

            {/* Product Card */}
            {product && product.found && (
                <div className="bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_rgba(11,54,29,0.06)] overflow-hidden">
                    {product.image && (
                        <div className="bg-surface-container-low p-6 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.image} alt={product.name} className="h-48 object-contain rounded-xl" />
                        </div>
                    )}
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-display font-bold text-primary">{product.name}</h2>
                                <p className="text-on-surface-variant font-body text-sm">{product.brand}</p>
                            </div>
                            {product.nutriscore && product.nutriscore !== "N/A" && (
                                <span className={`${nutriscoreColors[product.nutriscore] || "bg-gray-400"} text-white font-display font-bold px-3 py-1 rounded-full text-sm uppercase`}>
                                    {product.nutriscore}
                                </span>
                            )}
                        </div>

                        {/* Nutrition Grid */}
                        <p className="font-body text-on-surface-variant text-xs uppercase tracking-wider font-semibold mb-3">Nutrition per 100g</p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                                { l: "Calories", v: `${product.calories} kcal`, highlight: true },
                                { l: "Protein", v: `${product.protein}g` },
                                { l: "Carbs", v: `${product.carbs}g` },
                                { l: "Fat", v: `${product.fat}g` },
                                { l: "Fiber", v: `${product.fiber}g` },
                                { l: "Sugar", v: `${product.sugar}g` },
                            ].map((n) => (
                                <div key={n.l} className={`rounded-xl p-3 ${n.highlight ? "bg-primary/10" : "bg-surface-container-low"}`}>
                                    <p className={`text-lg font-display font-bold ${n.highlight ? "text-primary" : "text-on-surface"}`}>{n.v}</p>
                                    <p className="text-xs font-body text-on-surface-variant">{n.l}</p>
                                </div>
                            ))}
                        </div>

                        {product.serving_size && product.serving_size !== "N/A" && (
                            <p className="text-xs font-body text-on-surface-variant">Serving size: {product.serving_size}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
