'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ─── AddListingModal ──────────────────────────────────────────
// Drop this component anywhere in your admin listings page.
// Usage: <AddListingModal onManualAdd={() => { /* your existing add/submit logic */ }} />

interface AddListingModalProps {
    /** Called when user picks "Add manually" — wire this to your existing
     *  "Submit my first listing" / "Add new listing" handler. */
    onManualAdd: () => void;
    /** Optional: override the Job Bank route (default: /admin/job-bank) */
    jobBankPath?: string;
    /** Optional custom trigger label */
    triggerLabel?: string;
}

export function AddListingModal({
    onManualAdd,
    jobBankPath = '/admin/job-bank',
    triggerLabel = '+ Add listing',
}: AddListingModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const openModal = () => {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 120);
    };

    const close = () => {
        setOpen(false);
    };

    const handleManual = () => {
        setOpen(false);
        onManualAdd();
    };

    const handleJobBankPage = () => {
        setOpen(false);
        router.push(jobBankPath);
    };

    return (
        <>
            {/* ── Trigger button ── */}
            <button
                onClick={openModal}
                className="btn btn-sm btn-primary"
                style={{ fontWeight: 600, borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
                <i className="ti ti-plus" style={{ fontSize: '.9rem' }} />
                {triggerLabel}
            </button>

            {/* ── Modal backdrop ── */}
            {open && (
                <div
                    onClick={close}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15,23,42,.55)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 10500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                        animation: 'fadeInBD .18s ease',
                    }}
                >
                    <style>{`
            @keyframes fadeInBD { from { opacity:0 } to { opacity:1 } }
            @keyframes slideUp  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
            .alm-option {
              border: 2px solid #e2e8f0;
              border-radius: 14px;
              padding: 1.1rem 1.2rem;
              background: #fff;
              cursor: pointer;
              transition: border-color .15s, box-shadow .15s, background .15s;
              display: flex; align-items: flex-start; gap: .9rem;
            }
            .alm-option:hover {
              border-color: #2563eb;
              box-shadow: 0 0 0 3px rgba(37,99,235,.1);
              background: #f8faff;
            }
            .alm-option.selected {
              border-color: #2563eb;
              background: #eff6ff;
            }
          `}</style>

                    {/* ── Dialog ── */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 20,
                            boxShadow: '0 28px 90px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06)',
                            width: '100%', maxWidth: 500,
                            animation: 'slideUp .22s ease',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.15rem 1.4rem .9rem',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            background: 'linear-gradient(135deg, #f8faff 0%, #fff 100%)',
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem' }}>
                                    <span style={{
                                        width: 32, height: 32, borderRadius: 9,
                                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(37,99,235,.35)',
                                    }}>
                                        <i className="ti ti-briefcase" style={{ color: '#fff', fontSize: '.9rem' }} />
                                    </span>
                                    <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                        Add a New Listing
                                    </h5>
                                </div>
                                <p style={{ margin: 0, fontSize: '.78rem', color: '#64748b' }}>
                                    Choose how you'd like to add this listing
                                </p>
                            </div>
                            <button
                                onClick={close}
                                style={{
                                    background: '#f1f5f9', border: 'none', borderRadius: 8,
                                    width: 30, height: 30, cursor: 'pointer', fontSize: '1rem',
                                    color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >×</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* ── Option 1: Job Bank ID ── */}
                            <div style={{
                                border: '2px solid #e2e8f0', borderRadius: 14,
                                overflow: 'hidden', background: '#fafbff',
                            }}>
                                {/* Option header */}
                                <div style={{
                                    padding: '.85rem 1.1rem .75rem',
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex', alignItems: 'flex-start', gap: '.75rem',
                                }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                        background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                                        border: '1.5px solid #bfdbfe',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <i className="ti ti-sparkles" style={{ fontSize: '1rem', color: '#2563eb' }} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '.9rem', color: '#0f172a' }}>
                                            Auto-import from Job Bank
                                        </p>
                                        <p style={{ margin: '.15rem 0 0', fontSize: '.75rem', color: '#64748b', lineHeight: 1.4 }}>
                                            Enter a Job Bank ID and we'll automatically pull all listing details.
                                        </p>
                                    </div>
                                </div>

                                {/* Input row */}
                                <div style={{ padding: '.8rem 1.1rem 1rem' }}>
                                    {/* OR go to Job Bank page */}
                                    <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px dashed #e2e8f0' }}>
                                        <button
                                            onClick={handleJobBankPage}
                                            className="btn btn-sm btn-outline-primary"
                                            style={{ borderRadius: 8, fontWeight: 600, fontSize: '.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                        >
                                            <i className="ti ti-external-link" style={{ fontSize: '.8rem' }} />
                                            Go to Job Bank
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>or</span>
                                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            </div>

                            {/* ── Option 2: Manual ── */}
                            <button
                                onClick={handleManual}
                                style={{
                                    border: '2px solid #e2e8f0', borderRadius: 14, padding: '.85rem 1.1rem',
                                    background: '#fff', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '.85rem',
                                    textAlign: 'left', width: '100%',
                                    transition: 'border-color .15s, box-shadow .15s, background .15s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb';
                                    (e.currentTarget as HTMLButtonElement).style.background = '#f8faff';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                                    (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                    border: '1.5px solid #bbf7d0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className="ti ti-pencil" style={{ fontSize: '1rem', color: '#16a34a' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '.9rem', color: '#0f172a' }}>
                                        Add manually
                                    </p>
                                    <p style={{ margin: '.15rem 0 0', fontSize: '.75rem', color: '#64748b', lineHeight: 1.4 }}>
                                        Fill in all listing details yourself using the submission form.
                                    </p>
                                </div>
                                <i className="ti ti-arrow-right" style={{ fontSize: '.9rem', color: '#94a3b8', flexShrink: 0 }} />
                            </button>

                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '.7rem 1.4rem',
                            borderTop: '1px solid #f1f5f9',
                            background: '#fafbfc',
                            display: 'flex', justifyContent: 'flex-end',
                        }}>
                            <button
                                onClick={close}
                                className="btn btn-sm btn-outline-secondary"
                                style={{ borderRadius: 8, fontSize: '.8rem' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div >
            )
            }
        </>
    );
}