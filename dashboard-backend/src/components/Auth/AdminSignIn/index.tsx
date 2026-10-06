"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AuthLogoClient from "../AuthLogoClient";

// ─── Toast System (same as user page) ───────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';

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
        success: (title: string, message?: string) => add('success', title, message),
        error: (title: string, message?: string) => add('error', title, message),
        info: (title: string, message?: string) => add('info', title, message),
        warning: (title: string, message?: string) => add('warning', title, message),
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
    success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', bar: '#22c55e' },
    error: { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', bar: '#ef4444' },
    info: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', bar: '#3b82f6' },
    warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706', bar: '#f59e0b' },
};

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '360px',
            width: '100%',
            pointerEvents: 'none',
        }}>
            {toasts.map(toast => {
                const c = toastColors[toast.type];
                return (
                    <div key={toast.id} style={{
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                        pointerEvents: 'all',
                        animation: 'toastIn 0.3s cubic-bezier(.21,1.02,.73,1) forwards',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Progress bar */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            height: '3px',
                            background: c.bar,
                            borderRadius: '0 0 0 12px',
                            animation: 'toastProgress 4s linear forwards',
                            width: '100%',
                        }} />
                        <div style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>
                            {toastIcons[toast.type]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', lineHeight: 1.4 }}>
                                {toast.title}
                            </div>
                            {toast.message && (
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px', lineHeight: 1.4 }}>
                                    {toast.message}
                                </div>
                            )}
                        </div>
                        <button onClick={() => remove(toast.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9ca3af', padding: 0, flexShrink: 0, marginTop: '1px', lineHeight: 1,
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

// ─── Main Admin Sign‑In Component ──────────────────────────────────────────
export default function AdminSignIn({ logoUrl, logoAlt }: Props) {
    const router = useRouter();
    const [showPass, setShowPass] = useState(false);
    const toast = useToast();
    const { signInAsAdmin, isLoading, error, clearError } = useAuth();

    const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
    const [formData, setFormData] = useState({ email: '', password: '', mfaCode: '' });

    useEffect(() => {
        if (error) {
            toast.error('Sign In Failed', error);
            clearError?.();
        }
    }, [error]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        clearError?.();
    };

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.info('Signing in…', 'Checking your admin credentials.');
        const result = await signInAsAdmin({ email: formData.email, password: formData.password });
        if (result.requiresMFA) {
            toast.info('Two-Factor Required', 'Enter the 6-digit code from your authenticator app.');
            setStep('mfa');
        }
    };

    const handleMFASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.info('Verifying code…');
        const result = await signInAsAdmin({
            email: formData.email,
            password: formData.password,
            mfaCode: formData.mfaCode,
        });
        if (result.success) {
            toast.success('Welcome back!', 'Redirecting to admin panel…');
            // setTimeout(() => router.push('/admin/meta'), 1000);
            setTimeout(() => { window.location.href = '/admin/listings'; }, 1000);
        }
    };

    // ── Forgot‑password flow ──────────────────────────────────────────────
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [emailShow, enterEmailShow] = useState(false);
    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [otpToken, setOtpToken] = useState<string | null>(null);
    const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isChangingPass, setIsChangingPass] = useState(false);

    const requestOtp = async () => {
        if (!email) {
            toast.warning('Email Required', 'Please enter your email address.');
            return;
        }
        setIsSendingOtp(true);
        try {
            const res = await fetch('/api/auth/forgot-password/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.noPassword) {
                    toast.warning('No Password Set', 'This account uses Google Sign-In and has no password to reset.');
                } else {
                    toast.error('Failed to Send OTP', data.error || 'Please try again.');
                }
                return;
            }
            enterEmailShow(false);
            setShowOtpModal(true);
            toast.success('OTP Sent', 'Check your inbox — the code expires in 10 minutes.');
        } catch {
            toast.error('Network Error', 'Failed to send OTP. Check your connection.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) {
            toast.warning('OTP Required', 'Please enter the 6-digit code sent to your email.');
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const res = await fetch('/api/auth/forgot-password/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, email }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error('Invalid OTP', data.error || 'The code is incorrect or has expired.');
                return;
            }
            setOtpToken(data.actionToken);
            setShowOtpModal(false);
            setOtp('');
            toast.success('OTP Verified', 'Now set your new password below.');
            setShowNewPasswordModal(true);
        } catch {
            toast.error('Verification Failed', 'Something went wrong. Please try again.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const changePassword = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            toast.error('Passwords Do Not Match', 'Both fields must be identical.');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            toast.warning('Password Too Short', 'Use at least 8 characters.');
            return;
        }
        setPasswordError(null);
        setIsChangingPass(true);
        try {
            const res = await fetch('/api/auth/forgot-password/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionToken: otpToken, newPassword, email }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error('Password Change Failed', data.error || 'Please try again.');
                return;
            }
            toast.success('Password Changed!', 'You can now sign in with your new password.');
            setShowNewPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
            setOtpToken(null);
        } catch {
            toast.error('Network Error', 'Failed to change password. Check your connection.');
        } finally {
            setIsChangingPass(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            padding: '20px',
        }}>
            {/* Toast portal */}
            <ToastContainer toasts={toast.toasts} remove={toast.remove} />

            {/* Centered card */}
            <div style={{
                maxWidth: '440px',
                width: '100%',
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                padding: '32px 28px',
            }}>
                {/* Logo */}
                <div className="text-center mb-3">
                    <AuthLogoClient logoUrl={(logoUrl ? logoUrl : "/") || "/"} logoAlt={(logoAlt ? logoAlt : "/") || "/"} theme="light" />
                </div>

                {step === 'credentials' ? (
                    <>
                        {/* <h1 className="auth-page__title text-center">Admin / Sub‑Admin Sign In</h1> */}
                        <p className="auth-page__subtitle text-center">Secure access for administrators only.</p>

                        <form className="auth-form" onSubmit={handleCredentialsSubmit}>
                            <div className="auth-form__field">
                                <label className="auth-form__label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="auth-form__input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>

                            <div className="auth-form__field">
                                <label className="auth-form__label">Password</label>
                                <div className="auth-form__input-wrap">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        name="password"
                                        className="auth-form__input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Min 8 characters"
                                        required
                                    />
                                    <button type="button" className="auth-form__eye" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="auth-form__submit" disabled={isLoading}>
                                {isLoading ? 'Signing in…' : 'Sign in as Admin'}
                            </button>

                            {/* <p style={{ fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>
                                <span style={{ color: '#0d6efd', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => enterEmailShow(true)}>
                                    Forgot Password?
                                </span>
                            </p> */}
                        </form>

                        {/* <p className="text-center mt-3" style={{ fontSize: '13px', color: '#6b7280' }}>
                            <Link href="/auth/sign-in" style={{ color: '#5b50e1' }}>← User Login</Link>
                        </p> */}
                    </>
                ) : (
                    <>
                        <h1 className="auth-page__title text-center">Two-Factor Authentication</h1>
                        <p className="auth-page__subtitle text-center">Enter the 6-digit code from your authenticator app</p>

                        <form className="auth-form" onSubmit={handleMFASubmit}>
                            <div className="auth-form__field">
                                <label className="auth-form__label">Authentication Code</label>
                                <input
                                    type="text"
                                    name="mfaCode"
                                    className="auth-form__input"
                                    value={formData.mfaCode}
                                    onChange={handleChange}
                                    placeholder="000000"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    required
                                />
                            </div>

                            <button type="submit" className="auth-form__submit" disabled={isLoading}>
                                {isLoading ? 'Verifying…' : 'Verify'}
                            </button>

                            <button type="button" className="auth-form__secondary" onClick={() => setStep('credentials')}>
                                Back to login
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* Modals (email, OTP, new password) — same as user page */}
            {emailShow && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Forgot Password</h5>
                                <button type="button" className="btn-close" onClick={() => enterEmailShow(false)} />
                            </div>
                            <div className="modal-body">
                                <p>Enter your account email to receive a reset code.</p>
                                <input type="email" className="form-control" placeholder="Enter Email" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => enterEmailShow(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={requestOtp} disabled={isSendingOtp}>
                                    {isSendingOtp ? 'Sending…' : 'Send OTP'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showOtpModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Enter OTP</h5>
                                <button type="button" className="btn-close" onClick={() => setShowOtpModal(false)} />
                            </div>
                            <div className="modal-body">
                                <p>We sent a 6-digit OTP to <strong>{email}</strong>.</p>
                                <input type="text" className="form-control" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowOtpModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={verifyOtp} disabled={isVerifyingOtp}>
                                    {isVerifyingOtp ? 'Verifying…' : 'Verify'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showNewPasswordModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Set New Password</h5>
                                <button type="button" className="btn-close" onClick={() => setShowNewPasswordModal(false)} />
                            </div>
                            <div className="modal-body">
                                {passwordError && <div className="alert alert-danger">{passwordError}</div>}
                                <div className="mb-3">
                                    <label className="form-label">New Password (min. 8 characters)</label>
                                    <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Confirm Password</label>
                                    <input type="password" className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowNewPasswordModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={changePassword} disabled={isChangingPass}>
                                    {isChangingPass ? 'Changing…' : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Eye icon components (same as before)
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