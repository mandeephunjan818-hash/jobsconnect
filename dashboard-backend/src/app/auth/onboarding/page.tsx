"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/hooks/useProfile';

export default function Onboarding() {
    const router = useRouter();
    const { data: session } = useSession();
    const { completeOnboarding } = useProfile();

    const [formData, setFormData] = useState({
        dob: "",
        phone: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const result = await completeOnboarding({
            dob: formData.dob,
            phone: formData.phone || undefined,
        });

        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || "Failed to complete profile");
        }

        setLoading(false);
    };

    return (
        <div >
            <div className="onboarding-page">

                {/* Custom CSS to replicate Tailwind gradients, shadows, and hover effects */}
                <style jsx>{`
                .gradient-bg {
                    background: linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f3e8ff 100%);
                }
                .card-gradient-top {
                    background: linear-gradient(90deg, #3b82f6, #7c3aed);
                }
                .btn-gradient {
                    background: linear-gradient(90deg, #2563eb, #4f46e5);
                    border: none;
                    transition: all 0.2s ease;
                }
                .btn-gradient:hover {
                    background: linear-gradient(90deg, #1d4ed8, #4338ca);
                    transform: scale(1.02);
                }
                .btn-gradient:disabled {
                    opacity: 0.5;
                    transform: scale(1);
                }
                .rounded-2xl {
                    border-radius: 1rem;
                }
                .hover-shadow-xl:hover {
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }
                .icon-circle {
                    width: 4rem;
                    height: 4rem;
                    background-color: #dbeafe;
                    border-radius: 9999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .phone-icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                }
                .form-control-custom {
                    padding-left: 2.5rem;
                }
            `}</style>

                <div className="gradient-bg d-flex min-vh-100 align-items-center justify-content-center p-3">
                    <div className="card shadow-lg rounded-2xl hover-shadow-xl overflow-hidden" style={{ maxWidth: '28rem', width: '100%' }}>
                        <div className="card-gradient-top" style={{ height: '0.5rem' }}></div>

                        <div className="card-body p-4 p-md-5">
                            {/* Icon */}
                            <div className="d-flex justify-content-center mb-4">
                                <div className="icon-circle">
                                    <svg className="text-primary" width="2rem" height="2rem" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>

                            <h1 className="text-center fw-bold mb-2" style={{ fontSize: '1.875rem', color: '#1f2937' }}>Complete Your Profile</h1>
                            <p className="text-center text-muted mb-4">
                                Welcome, <span className="fw-semibold text-dark">{session?.user?.name || 'User'}</span>!
                                We need a few more details to get you started.
                            </p>

                            {error && (
                                <div className="alert alert-danger border-start border-4 border-danger py-2 mb-4" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {/* Date of Birth */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold text-secondary mb-1">
                                        Date of Birth <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                                        className="form-control"
                                        required
                                    />
                                </div>

                                {/* Phone Number */}
                                <div className="mb-4 position-relative">
                                    <label className="form-label fw-semibold text-secondary mb-1">
                                        Phone Number <span className="text-muted small fw-normal">(optional)</span>
                                    </label>
                                    <div className="position-relative">
                                        <div className="phone-icon">
                                            <svg width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-secondary">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            className="form-control form-control-custom"
                                            placeholder="+1 234 567 8900"
                                        />
                                    </div>
                                    <small className="text-muted">Include country code for best results</small>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-gradient text-white fw-semibold w-100 py-2 rounded-3"
                                >
                                    {loading ? (
                                        <span className="d-flex align-items-center justify-content-center gap-2">
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </span>
                                    ) : (
                                        'Complete Setup'
                                    )}
                                </button>
                            </form>

                            <p className="small text-muted text-center mt-4 mb-0">
                                Your timezone: {formData.timezone}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}