"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthLogoClient from "./AuthLogoClient";

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

export default function OtpSignIn({ logoUrl, logoAlt }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get("registered");

    const toast = useToast();
    const { requestLoginOtp, signInWithOtp, isLoading, error, clearError } = useAuth();

    const [step, setStep] = useState<"email" | "otp">("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── URL param toast — fires once on mount ──
    useEffect(() => {
        if (registered) toast.success("Email Verified", "Your account is ready. Enter your email to receive a login code.");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Mirror auth hook errors into toasts ──
    useEffect(() => {
        if (error) {
            toast.error("Sign In Failed", error);
            clearError?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    // ── Cleanup cooldown interval on unmount ──
    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    const startCooldown = () => {
        setCooldown(60);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.warning("Email Required", "Please enter your email address.");
            return;
        }

        toast.info("Sending code…", "Please wait a moment.");
        const result = await requestLoginOtp(email);

        if (result.success) {
            toast.success("Code Sent", "Check your inbox for your login code.");
            setStep("otp");
            startCooldown();
            return;
        }

        if (result.notRegistered) {
            toast.warning("No Account Found", "Redirecting you to create one…");
            setTimeout(() => {
                router.push(`/auth/sign-up?email=${encodeURIComponent(email)}&reason=unregistered`);
            }, 1200);
            return;
        }

        if (result.needsVerification) {
            toast.warning("Verify Your Email", "Please verify your email before signing in.");
            // optionally: trigger a resend-verification call here
            return;
        }
        // any other error is already handled by the useEffect(error) toast
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        toast.info("Resending code…");
        const result = await requestLoginOtp(email);
        if (result.success) {
            toast.success("Code Resent", "Check your inbox for the new code.");
            startCooldown();
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) {
            toast.warning("Code Required", "Please enter the 6-digit code sent to your email.");
            return;
        }

        toast.info("Verifying…");
        const result = await signInWithOtp(email, otp);

        if (result.success) {
            toast.success("Welcome back!", "Redirecting to your dashboard…");
        }
        // API errors are handled by the useEffect above
    };

    return (
        <div className="auth-page">
            {/* ── Toast Portal ── */}
            <ToastContainer toasts={toast.toasts} remove={toast.remove} />

            <div className="auth-page__left">
                <div className="auth-page__logo">
                    <AuthLogoClient logoUrl={(logoUrl ? logoUrl : "/") || "/"} logoAlt={(logoAlt ? logoAlt : "/") || "/"} theme="light" />
                </div>

                <div className="auth-page__form-wrap mx-auto w-75">
                    {step === "email" ? (
                        <>
                            <h1 className="auth-page__title">Employer Sign in</h1>
                            <p className="auth-page__subtitle">Enter your email to receive a login code.</p>

                            <form className="auth-form" onSubmit={handleEmailSubmit}>
                                <div className="auth-form__field">
                                    <label className="auth-form__label">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="auth-form__input"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>

                                <button type="submit" className="auth-form__submit" disabled={isLoading}>
                                    {isLoading ? "Sending code…" : "Send Login Code"}
                                </button>
                            </form>

                            <p className="auth-page__footer-text">
                                Need an account?{" "}
                                <Link href="/auth/sign-up" className="auth-page__footer-link">Register</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="auth-page__title">Enter Your Code</h1>
                            <p className="auth-page__subtitle">
                                We sent a 6-digit code to <strong>{email}</strong>
                            </p>

                            <form className="auth-form" onSubmit={handleOtpSubmit}>
                                <div className="auth-form__field">
                                    <label className="auth-form__label">Login Code</label>
                                    <input
                                        type="text"
                                        name="otp"
                                        className="auth-form__input"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        placeholder="000000"
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        required
                                    />
                                </div>

                                <button type="submit" className="auth-form__submit" disabled={isLoading}>
                                    {isLoading ? "Verifying…" : "Sign in"}
                                </button>

                                <p style={{ fontSize: "12px" }}>
                                    <span
                                        style={{
                                            color: cooldown > 0 ? "#9ca3af" : "#5b50e1",
                                            fontSize: "12px",
                                            cursor: cooldown > 0 ? "default" : "pointer",
                                            textDecoration: cooldown > 0 ? "none" : "underline",
                                        }}
                                        onClick={handleResend}
                                    >
                                        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                                    </span>
                                </p>

                                <button type="button" className="auth-form__secondary btn btn-secondary" onClick={() => setStep("email")}>
                                    Back
                                </button>
                            </form>
                        </>
                    )}
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
    );
}