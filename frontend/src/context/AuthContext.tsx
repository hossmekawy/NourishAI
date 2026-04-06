"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
    token: string | null;
    login: (token: string, rememberMe?: boolean) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export const checkAuthStatus = () => {
    try {
        const stored = localStorage.getItem("auth_data");
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Date.now() < parsed.expiresAt) {
                return parsed.token;
            }
            localStorage.removeItem("auth_data");
        }
    } catch { /* ignore */ }
    return null;
};

const AuthContext = createContext<AuthContextType>({
    token: null,
    login: () => { },
    logout: () => { },
    isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const validToken = checkAuthStatus();
        if (validToken) setToken(validToken);
    }, []);

    const login = (newToken: string, rememberMe: boolean = false) => {
        const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
        const expiresAt = Date.now() + duration;
        localStorage.setItem("auth_data", JSON.stringify({ token: newToken, expiresAt }));
        setToken(newToken);
        router.push("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("auth_data");
        setToken(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
