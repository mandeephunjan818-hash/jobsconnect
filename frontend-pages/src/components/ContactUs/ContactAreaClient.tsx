"use client";

import Image from 'next/image';
import ContactForm from '@/form/ContactForm';
import contact2_img from "@/assets/images/contact-us/contact2.png";

interface ContactAreaClientProps {
    phone?: string;
}

function HeadsetIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
            <path d="M21 15v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 15v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
    );
}

function MailBoxIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 6-10 7L2 6" />
        </svg>
    );
}

export default function ContactAreaClient({ phone }: ContactAreaClientProps) {
    return (
        <section className="lmx-contact-section">
            <div className="container">
                <div className="lmx-contact-inner">

                    <div className="lmx-contact-thumb-col">
                        <div className="lmx-contact-thumb">
                            <Image
                                src={contact2_img}
                                alt="Contact us"
                                width={526}
                                height={632}
                                className="lmx-contact-thumb-img"
                            />
                        </div>

                        <div className="lmx-contact-help-card">
                            <span className="lmx-contact-help-icon"><HeadsetIcon /></span>
                            <p className="lmx-contact-help-title">Need Help?</p>
                            <p className="lmx-contact-help-text">
                                Our support team is available from Mon - Fri, 9AM - 6PM
                            </p>
                            {phone && (
                                <a href={`tel:${phone}`} className="lmx-contact-help-btn">
                                    Call: {phone}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="lmx-contact-form-col">
                        <div className="lmx-contact-card">
                            <div className="lmx-contact-card-header">
                                <span className="lmx-contact-card-icon"><MailBoxIcon /></span>
                                <div>
                                    <h2>
                                        Send us a <span>Message</span>
                                    </h2>
                                    <p>Fill out the form below and we&apos;ll get back to you shortly.</p>
                                </div>
                            </div>

                            <ContactForm />
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                .lmx-contact-section { padding: 60px 0; }
                .lmx-contact-inner {
                    display: grid;
                    grid-template-columns: 380px 1fr;
                    gap: 30px;
                    align-items: start;
                }
                @media (max-width: 991px) {
                    .lmx-contact-inner { grid-template-columns: 1fr; }
                }

                /* ── Thumb column ── */
                .lmx-contact-thumb-col { position: relative; }
                .lmx-contact-thumb {
                    border-radius: 16px;
                    overflow: hidden;
                }
                .lmx-contact-thumb-img { width: 100%; height: auto; display: block; }

                .lmx-contact-help-card {
                    position: absolute;
                    left: -20px;
                    bottom: -30px;
                    width: calc(100% - 20px);
                    max-width: 260px;
                    background: linear-gradient(135deg, var(--accent-color, #6d28d9), #a855f7);
                    border-radius: 14px;
                    padding: 22px;
                    color: #fff;
                    box-shadow: 0 20px 40px -12px rgba(109,40,217,0.45);
                }
                @media (max-width: 575px) {
                    .lmx-contact-help-card { position: static; margin-top: -40px; margin-left: 12px; }
                }
                .lmx-contact-help-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: #fff;
                    color: var(--accent-color, #6d28d9);
                    margin-bottom: 14px;
                }
                .lmx-contact-help-title { font-size: 17px; font-weight: 700; margin: 0 0 6px; }
                .lmx-contact-help-text { font-size: 13px; opacity: .9; line-height: 1.5; margin: 0 0 16px; }
                .lmx-contact-help-btn {
                    display: inline-block;
                    background: #fff;
                    color: var(--accent-color, #6d28d9);
                    font-size: 13px;
                    font-weight: 700;
                    padding: 10px 16px;
                    border-radius: 8px;
                }

                /* ── Form card ── */
                .lmx-contact-card {
                    background: #fff;
                    border-radius: 16px;
                    padding: 32px;
                    box-shadow: 0 4px 24px rgba(0,26,61,0.06);
                }
                .lmx-contact-card-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    margin-bottom: 26px;
                }
                .lmx-contact-card-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 46px;
                    height: 46px;
                    flex-shrink: 0;
                    border-radius: 10px;
                    background: #ede9fe;
                    color: var(--accent-color, #6d28d9);
                }
                .lmx-contact-card-header h2 { font-size: 22px; font-weight: 800; margin: 0 0 4px; color: var(--heading-color, #0f172a); }
                .lmx-contact-card-header h2 span { color: var(--accent-color, #6d28d9); }
                .lmx-contact-card-header p { font-size: 13.5px; color: #64748b; margin: 0; }

                /* ── Form fields (used by ContactForm.tsx) ── */
                .lmx-contact-form { display: flex; flex-direction: column; gap: 16px; }
                .lmx-contact-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                @media (max-width: 575px) { .lmx-contact-row { grid-template-columns: 1fr; } }

                .lmx-contact-field { display: flex; flex-direction: column; gap: 6px; }
                .lmx-contact-input-wrap {
                    position: relative;
                    border: 1px solid rgba(0,26,61,0.12);
                    border-radius: 10px;
                    transition: border-color .15s;
                }
                .lmx-contact-input-wrap:focus-within { border-color: var(--accent-color, #6d28d9); }
                .lmx-contact-input-wrap.has-error { border-color: #dc2626; }

                .lmx-contact-input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }
                .lmx-contact-input-icon--top { top: 16px; transform: none; }

                .lmx-contact-input-wrap input,
                .lmx-contact-input-wrap textarea {
                    width: 100%;
                    border: none;
                    background: none;
                    padding: 14px 14px 14px 42px;
                    font-size: 13.5px;
                    color: var(--heading-color, #0f172a);
                }
                .lmx-contact-input-wrap input:focus,
                .lmx-contact-input-wrap textarea:focus { outline: none; }
                .lmx-contact-textarea-wrap textarea { resize: vertical; min-height: 120px; }

                .lmx-contact-error { font-size: 12px; color: #dc2626; margin: 0; }

                .lmx-contact-form-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 14px;
                    margin-top: 6px;
                }
                .lmx-contact-submit-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .lmx-contact-safe-note {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #94a3b8;
                    margin: 0;
                }
            `}</style>
        </section>
    );
}