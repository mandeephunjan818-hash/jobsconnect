"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import icon2 from "../public/images/icon/sms.svg"
import Image from "next/image";

interface Props {
    logoUrl?: string;
    logoAlt?: string;
}

export default function SubscribeModalNew({ logoUrl, logoAlt }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    useEffect(() => {
        const dismissed = sessionStorage.getItem("sub_modal_dismissed");
        if (dismissed) return;
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem("sub_modal_dismissed", "true");
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
            const apiUrl =
                process.env.NEXT_PUBLIC_SUBSCRIBE_API_URL || "/api/subscribe";

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    siteId: window.location.hostname,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to subscribe");

            toast.success(json.message || "You’ve successfully subscribed!");
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
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    backdropFilter: "blur(6px)",
                    zIndex: 9998,
                    animation: "fadeIn 0.3s ease",
                }}
            />

            {/* Modal Card */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sub-modal-title"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 9999,
                    width: "min(92vw, 460px)",
                    backgroundColor: "#ffffff",
                    borderRadius: "28px",
                    boxShadow: "0 30px 60px rgba(0,0,0,0.2)",
                    overflow: "hidden",
                    animation: "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    aria-label="Close"
                    style={{
                        position: "absolute",
                        top: "20px",
                        right: "20px",
                        background: "rgba(0,0,0,0.05)",
                        border: "none",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#475569",
                        fontSize: "16px",
                        transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.background = "rgba(0,0,0,0.1)")
                    }
                    onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.background = "rgba(0,0,0,0.05)")
                    }
                >
                    ✕
                </button>

                {/* Content */}
                <div style={{ padding: "36px 32px 32px" }}>
                    {/* Logo / Branding */}
                    <div style={{ marginBottom: "28px", textAlign: "center" }}>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={logoAlt || "Logo"}
                                style={{ height: "36px", objectFit: "contain" }}
                            />
                        ) : (
                            <span
                                className={`d-flex align-items-center justify-content-center me-auto  text-dark h4`}
                                style={{
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    display: "inline-block",
                                    padding: "0",
                                }}
                            >
                                No logo provided
                            </span>
                        )}
                    </div>

                    {/* Headline */}
                    <h2
                        id="sub-modal-title"
                        style={{
                            fontSize: "1.6rem",
                            fontWeight: 700,
                            textAlign: "center",
                            color: "#0f172a",
                            marginBottom: "10px",
                        }}
                    >
                        Don’t miss a great opportunity
                    </h2>
                    <p
                        style={{
                            textAlign: "center",
                            color: "#64748b",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            marginBottom: "28px",
                        }}
                    >
                        Get fresh job listings and career tips delivered to your inbox.
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubscribe} noValidate>
                        <div className="input-field pos-rel">
                            <input
                                type="email"
                                placeholder="Your email address"
                                value={email}
                                className="form-control"
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                // style={{
                                //         width: "100%",
                                //         padding: "14px 18px",
                                //         border: "2px solid #e2e8f0",
                                //         borderRadius: "50px",
                                //         fontSize: "0.95rem",
                                //         outline: "none",
                                //         marginBottom: "14px",
                                //         transition: "border-color 0.2s, box-shadow 0.2s",
                                //         boxSizing: "border-box",
                                //     }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "var(--accent-color, #1438bc)";
                                    e.target.style.boxShadow =
                                        "0 0 0 4px rgba(108,63,207,0.15)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "#e2e8f0";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                            <div className="img">
                                <Image src={icon2} alt="Email icon" />
                            </div>
                        </div>
                        <div
                            className="xb-btn wow fadeInUp mx-auto w-100 d-flex justify-content-center align-items-center"
                            data-wow-delay="300ms"
                            data-wow-duration="600ms"
                        >
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data_blue"
                            >
                                <div className="xb-item--hidden">
                                    <span className="xb-item--hidden-text">
                                        {isSubmitting ? "Subscribing…" : "Subscribe Now"}
                                    </span>
                                </div>
                                <div className="xb-item--holder">
                                    <span className="xb-item--text xb-item--text1">
                                        {isSubmitting ? "Subscribing…" : "Subscribe Now"}
                                    </span>
                                    <div className="xb-item--icon">
                                        <i className="fal fa-plus"></i>
                                    </div>
                                    <span className="xb-item--text xb-item--text2">
                                        {isSubmitting ? "Subscribing…" : "Subscribe Now"}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </form>

                    {/* Dismiss link */}
                    <p
                        onClick={handleClose}
                        style={{
                            textAlign: "center",
                            marginTop: "20px",
                            fontSize: "0.85rem",
                            color: "#94a3b8",
                            cursor: "pointer",
                            userSelect: "none",
                        }}
                    >
                        No thanks, I’ll miss out
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 30px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
        </>
    );
}