"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import AuthLogoClient from "../AuthLogoClient";

// ─── Toast System ─────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
}

let toastCounter = 0;

function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const add = useCallback((type: ToastType, title: string, message?: string) => {
        const id = ++toastCounter;
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const remove = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return {
        toasts,
        success: (title: string, message?: string) => add("success", title, message),
        error: (title: string, message?: string) => add("error", title, message),
        info: (title: string, message?: string) => add("info", title, message),
        warning: (title: string, message?: string) => add("warning", title, message),
        remove,
    };
}

const toastIcons: Record<ToastType, React.ReactNode> = {
    success: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    error: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    info: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    warning: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
};

const toastColors: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
    success: { bg: "#f0fdf4", border: "#86efac", icon: "#16a34a", bar: "#22c55e" },
    error: { bg: "#fef2f2", border: "#fca5a5", icon: "#dc2626", bar: "#ef4444" },
    info: { bg: "#eff6ff", border: "#93c5fd", icon: "#2563eb", bar: "#3b82f6" },
    warning: { bg: "#fffbeb", border: "#fcd34d", icon: "#d97706", bar: "#f59e0b" },
};

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
    return (
        <div style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxWidth: "360px",
            width: "100%",
            pointerEvents: "none",
        }}>
            {toasts.map(toast => {
                const c = toastColors[toast.type];
                return (
                    <div key={toast.id} style={{
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        borderRadius: "12px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                        pointerEvents: "all",
                        animation: "toastIn 0.3s cubic-bezier(.21,1.02,.73,1) forwards",
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        {/* Progress bar */}
                        <div style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            height: "3px",
                            background: c.bar,
                            borderRadius: "0 0 0 12px",
                            animation: "toastProgress 4s linear forwards",
                            width: "100%",
                        }} />

                        {/* Icon */}
                        <div style={{ color: c.icon, flexShrink: 0, marginTop: "1px" }}>
                            {toastIcons[toast.type]}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827", lineHeight: 1.4 }}>
                                {toast.title}
                            </div>
                            {toast.message && (
                                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px", lineHeight: 1.4 }}>
                                    {toast.message}
                                </div>
                            )}
                        </div>

                        {/* Close */}
                        <button onClick={() => remove(toast.id)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#9ca3af", padding: 0, flexShrink: 0, marginTop: "1px", lineHeight: 1,
                        }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                );
            })}

            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(40px) scale(0.95); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes toastProgress {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>
        </div>
    );
}


interface Props {
    logoUrl?: string;
    logoAlt?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SignUp({ logoUrl, logoAlt }: Props) {
    const router = useRouter();
    const { signUp, isLoading, error, clearError } = useAuth();
    const toast = useToast();

    const [formData, setFormData] = useState({ name: "", email: "", password: "" });
    const [showPass, setShowPass] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Mirror auth hook errors into toasts
    useEffect(() => {
        if (error) {
            toast.error("Sign Up Failed", error);
            clearError?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => { const u = { ...prev }; delete u[name]; return u; });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Name is required.";
        }
        if (!formData.email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email.";
        }
        if (!formData.password) {
            newErrors.password = "Password is required.";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters.";
        }

        setFieldErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.warning("Validation Error", "Please fix the highlighted fields before continuing.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        toast.info("Creating account…", "Please wait a moment.");
        const result = await signUp(formData);

        if (result.success) {
            toast.success("Account Created!", "Check your email to verify your account. Redirecting…");
            setTimeout(() => router.push("/auth/sign-in?registered=true"), 2500);
        }
        // API errors are handled by the useEffect above
    };

    return (
        <>
            {/* ── Toast Portal ── */}
            <ToastContainer toasts={toast.toasts} remove={toast.remove} />

            <div className="auth-page">
                <div className="auth-page__left">
                    <div className="auth-page__logo">
                        <AuthLogoClient logoUrl={(logoUrl ? logoUrl : "/") || "/"} logoAlt={(logoAlt ? logoAlt : "/") || "/"} theme="light" />
                    </div>

                    <div className="auth-page__form-wrap mx-auto w-75">
                        <h1 className="auth-page__title">Employer Sign up</h1>
                        <p className="auth-page__subtitle">Sign up to enjoy the features of Jobs Connect</p>

                        <form className="auth-form" onSubmit={handleSubmit} noValidate>
                            {/* Name */}
                            <div className="auth-form__field">
                                <label className="auth-form__label">Your Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className={`auth-form__input${fieldErrors.name ? " border-red-500" : ""}`}
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                />
                                {fieldErrors.name && (
                                    <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="auth-form__field">
                                <label className="auth-form__label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className={`auth-form__input${fieldErrors.email ? " border-red-500" : ""}`}
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                />
                                {fieldErrors.email && (
                                    <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.email}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="auth-form__field">
                                <label className="auth-form__label">Password</label>
                                <div className="auth-form__input-wrap">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        name="password"
                                        className={`auth-form__input${fieldErrors.password ? " border-red-500" : ""}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Min 8 characters"
                                        minLength={8}
                                    />
                                    <button type="button" className="auth-form__eye" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.password}</p>
                                )}
                            </div>

                            {/* Submit */}
                            <button type="submit" className="auth-form__submit" disabled={isLoading}>
                                {isLoading ? "Creating account…" : "Sign up"}
                            </button>
                        </form>

                        <p className="auth-page__footer-text">
                            Already have an account?{" "}
                            <Link href="/auth/sign-in" className="auth-page__footer-link">Sign in</Link>
                        </p>
                    </div>
                </div>

                <div className="auth-page__right">
                    <div className="auth-page__illustration">
                        <Image
                            src="/dash/assets/AuthImage.svg"
                            alt="Healthcare professionals"
                            fill
                            style={{ objectFit: "cover" }}
                            priority
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

function EyeOffIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}