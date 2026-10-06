"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Props {
    logoUrl?: string;
    logoAlt?: string;
}

const DISMISS_KEY = "subscribe_modal_dismissed_time";
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export default function SubscribeModal({ logoUrl, logoAlt }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    useEffect(() => {
        const stored = localStorage.getItem(DISMISS_KEY);
        if (stored) {
            const dismissedTime = parseInt(stored, 10);
            // If dismissed less than 30 days ago, do not show the modal
            if (!isNaN(dismissedTime) && Date.now() - dismissedTime < ONE_MONTH_MS) {
                return;
            }
        }
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error("Please enter your email address.");
            return;
        }
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, siteId: window.location.hostname }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to subscribe");

            toast.success(json.message || "You've successfully subscribed!");
            setEmail("");
            handleClose();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.55)",
                    backdropFilter: "blur(4px)",
                    zIndex: 9998,
                    animation: "fadeIn 0.3s ease",
                }}
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="subscribe-modal-title"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 9999,
                    width: "min(90vw, 480px)",
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                    animation: "slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    aria-label="Close subscribe modal"
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        color: "#6c757d",
                        lineHeight: 1,
                        fontSize: "20px",
                    }}
                >
                    ✕
                </button>

                {/* Content */}
                <div style={{ padding: "36px 40px 40px" }}>

                    {/* Logo — mirrors HeaderOneClient pattern */}
                    <Link href="/">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={logoAlt || "Logo"}
                                width={200}
                                height={70}
                                style={{ objectFit: "contain", marginBottom: "8px" }}
                                unoptimized={logoUrl.startsWith("http")}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-start bg-transparent me-auto w-full">
                                <div className="px-3 py-2 my-2 rounded text-white h3 fs-bold bg-primary">JC</div>
                                <p className="text-dark ms-3 h5">
                                    Jobs<span className="text-primary"> Connect </span>
                                </p>
                            </div>
                        )}
                    </Link>

                    <h2
                        id="subscribe-modal-title"
                        style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px", color: "#1a1a2e" }}
                    >
                        Stay in the Loop!
                    </h2>
                    <p style={{ color: "#6c757d", marginBottom: "24px", fontSize: "15px", lineHeight: 1.6 }}>
                        Get the latest job listings and blog updates delivered straight to your inbox. No spam, ever.
                    </p>

                    <form onSubmit={handleSubscribe} noValidate>
                        <input
                            type="email"
                            placeholder="Your Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "1.5px solid #dee2e6",
                                borderRadius: "8px",
                                fontSize: "15px",
                                outline: "none",
                                marginBottom: "12px",
                                transition: "border-color 0.2s",
                                boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--bs-primary, --accent-color)")}
                            onBlur={(e) => (e.target.style.borderColor = "#dee2e6")}
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                width: "100%",
                                padding: "13px",
                                background: "var(--bs-primary, --accent-color)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "15px",
                                fontWeight: 600,
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                                opacity: isSubmitting ? 0.7 : 1,
                                transition: "opacity 0.2s, transform 0.15s",
                            }}
                            onMouseEnter={(e) => !isSubmitting && ((e.target as HTMLElement).style.transform = "translateY(-1px)")}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = "translateY(0)")}
                        >
                            {isSubmitting ? "Subscribing…" : "Subscribe Now"}
                        </button>
                    </form>

                    <p
                        onClick={handleClose}
                        style={{
                            textAlign: "center",
                            marginTop: "16px",
                            fontSize: "13px",
                            color: "#adb5bd",
                            cursor: "pointer",
                            userSelect: "none",
                        }}
                    >
                        No thanks, I&apos;ll miss out
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, calc(-50% + 24px)); }
                    to   { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </>
    );
}