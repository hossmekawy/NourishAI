"use client"

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { useAuth } from "@/context/AuthContext";

const GOOGLE_CLIENT_ID = "720022227098-a8u0lsujhc6tijj21pnkilnb95d60plu.apps.googleusercontent.com";

export default function RegisterPage() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <RegisterContent />
        </GoogleOAuthProvider>
    );
}

function RegisterContent() {
    const { login } = useAuth();

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const res = await fetch("http://localhost:8000/auth/google/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ access_token: tokenResponse.access_token }),
                });
                const data = await res.json();
                if (res.ok && data.access) {
                    localStorage.setItem("refresh_token", data.refresh || "");
                    login(data.access);
                } else if (res.ok && data.key) {
                    login(data.key);
                } else {
                    alert("Registration failed: " + JSON.stringify(data));
                }
            } catch {
                alert("Network error connecting to Django backend.");
            }
        },
    });

    return (
        <div className="flex min-h-screen">
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-surface-container-low">
                <div>
                    <h1 className="text-4xl font-display font-bold text-primary mb-2">NourishAI</h1>
                    <p className="text-on-surface-variant font-body">Editorial Health Standard</p>
                </div>
                <div className="mb-12">
                    <h2 className="text-5xl font-display font-medium text-primary leading-tight mb-8">Start Your<br />Journey.</h2>
                    <p className="text-on-surface-variant font-body text-lg max-w-md">Elevate your nutrition with AI-powered insights, wrapped in an editorial experience designed for your vitality.</p>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0_20px_40px_rgba(11,54,29,0.06)] border border-outline-variant/15 w-80">
                    <p className="font-body text-on-surface-variant text-sm mb-2 uppercase tracking-wider font-semibold">Our Promise</p>
                    <p className="font-display text-primary text-xl font-medium mb-1">&quot;To treat your data not as a spreadsheet, but as a premium lifestyle publication.&quot;</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
                <div className="w-full max-w-md">
                    <h3 className="text-3xl font-display font-semibold text-primary mb-2">Create Account</h3>
                    <p className="text-on-surface-variant mb-10 font-body">Join NourishAI and elevate your nutrition.</p>

                    <form className="space-y-6">
                        <div>
                            <label className="block font-body text-on-surface-variant mb-2 text-sm">Full Name</label>
                            <input type="text" placeholder="Jane Doe" className="w-full bg-surface-container-low border-0 px-4 py-3 rounded-xl focus:ring-0 focus:bg-surface-container-lowest focus:border focus:border-primary/40 focus:outline outline-primary/40 transition-colors shadow-sm font-body text-on-surface" />
                        </div>
                        <div>
                            <label className="block font-body text-on-surface-variant mb-2 text-sm">Email Address</label>
                            <input type="email" placeholder="you@example.com" className="w-full bg-surface-container-low border-0 px-4 py-3 rounded-xl focus:ring-0 focus:bg-surface-container-lowest focus:border focus:border-primary/40 focus:outline outline-primary/40 transition-colors shadow-sm font-body text-on-surface" />
                        </div>
                        <div>
                            <label className="block font-body text-on-surface-variant mb-2 text-sm">Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-surface-container-low border-0 px-4 py-3 rounded-xl focus:ring-0 focus:bg-surface-container-lowest focus:border focus:border-primary/40 focus:outline outline-primary/40 transition-colors shadow-sm font-body text-on-surface" />
                        </div>
                        <button type="button" className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-display font-semibold rounded-full shadow-[0_10px_20px_rgba(11,54,29,0.1)] hover:shadow-[0_15px_30px_rgba(11,54,29,0.15)] transition-all flex justify-center items-center gap-2">
                            Get Started <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-center space-x-4">
                        <div className="h-px bg-outline-variant/30 flex-1"></div>
                        <span className="font-body text-on-surface-variant text-sm">OR CONTINUE WITH</span>
                        <div className="h-px bg-outline-variant/30 flex-1"></div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <button onClick={() => loginWithGoogle()} className="flex justify-center items-center gap-3 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low transition-colors font-body font-medium text-on-surface shadow-sm cursor-pointer">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                            </svg>
                            Google
                        </button>
                        <button className="flex justify-center items-center gap-3 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low transition-colors font-body font-medium text-on-surface shadow-sm opacity-60 cursor-not-allowed" title="Apple login coming soon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-5 w-5" fill="currentColor">
                                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                            </svg>
                            Apple
                        </button>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="font-body text-on-surface-variant">Already have an account? <Link href="/login" className="text-secondary-dim font-semibold hover:text-secondary transition-colors underline underline-offset-4 decoration-2">Sign In</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
