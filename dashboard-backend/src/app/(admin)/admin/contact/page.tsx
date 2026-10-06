'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

const tinymceConfig = {
    height: 200,
    menubar: false,
    plugins: ['advlist', 'autolink', 'lists', 'link', 'charmap', 'searchreplace', 'code', 'table'],
    toolbar:
        'undo redo | bold italic underline | forecolor | ' +
        'alignleft aligncenter alignright | bullist numlist | link | removeformat',
    content_style: 'body { font-family: system-ui, sans-serif; font-size: 13px; color: #2c3e50; }',
};

interface ContactMessageItem {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'unread' | 'read' | 'replied';
    createdAt: string;
    site: string;
    replies?: Array<{ id: string; message: string; createdAt: string }>;
}

interface ApiResponse {
    data: ContactMessageItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ─── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status, design }: { status: string; design: 1 | 2 }) {
    if (design === 1) {
        const map: Record<string, string> = {
            unread: 'cmp-badge--unread',
            read: 'cmp-badge--read',
            replied: 'cmp-badge--replied',
        };
        return <span className={`cmp-badge ${map[status] || 'cmp-badge--read'}`}>{status}</span>;
    }
    const cfg: Record<string, { bg: string; color: string; dot: string }> = {
        unread: { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
        read: { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
        replied: { bg: '#dcfce7', color: '#14532d', dot: '#22c55e' },
    };
    const c = cfg[status] ?? cfg.read;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700,
            background: c.bg, color: c.color, textTransform: 'capitalize', whiteSpace: 'nowrap',
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
            {status}
        </span>
    );
}

// ─── Message Modal (adapts to design) ─────────────────────────
function MessageModal({ message, onClose, onSendReply, sending, replyText, setReplyText, editorRef, design }: {
    message: ContactMessageItem;
    onClose: () => void;
    onSendReply: () => void;
    sending: boolean;
    replyText: string;
    setReplyText: (v: string) => void;
    editorRef: React.MutableRefObject<any>;
    design: 1 | 2;
}) {
    if (design === 1) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="cmp-modal">
                    <div className="cmp-modal__header">
                        <button className="cmp-btn cmp-btn--ghost" onClick={onClose} aria-label="Close">
                            <i className="ti ti-x" style={{ fontSize: 18 }}></i>
                        </button>
                    </div>
                    <div className="cmp-modal__body">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <div className='d-flex justify-content align-items-center' >
                                    <label className='cmp-card__from-name' >Full Name</label>
                                    <span className="cmp-card__from-name">{message.name}</span>
                                </div>
                                {/* <StatusBadge status={message.status} design={1} /> */}
                            </div>
                            {message.site && (
                                <span style={{ fontSize: '.7rem', fontWeight: 700, background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: 20, border: '1px solid #bae6fd' }}>
                                    {message.site}
                                </span>
                            )}
                            <div className='d-flex justify-content align-items-center' >
                                <label className='cmp-card__from-name' >Email</label>
                                <p className="cmp-modal__email">{message.email}</p>
                            </div>
                        </div>
                        <div className="cmp-modal__subject">
                            <span className="cmp-label">Subject</span>
                            <p>{message.subject}</p>
                        </div>
                        <div>
                            <span className="cmp-label">Message</span>
                            <div className="cmp-modal__bubble" dangerouslySetInnerHTML={{ __html: message.message }} />
                        </div>
                        {message.replies && message.replies.length > 0 && (
                            <div className="cmp-modal__replies">
                                <span className="cmp-label">Previous replies</span>
                                {message.replies.map(r => (
                                    <div key={r.id} className="cmp-modal__reply-bubble">
                                        <div dangerouslySetInnerHTML={{ __html: r.message }} />
                                        <span className="cmp-modal__reply-date">{new Date(r.createdAt).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="cmp-modal__reply-form">
                            <span className="cmp-label">Reply</span>
                            <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                onInit={(_e, ed) => (editorRef.current = ed)}
                                onEditorChange={setReplyText} initialValue="" init={tinymceConfig} />
                        </div>
                    </div>
                    <div className="cmp-modal__footer">
                        <button className="cmp-btn cmp-btn--secondary" onClick={onClose}>Cancel</button>
                        <button className="cmp-btn cmp-btn--primary cmp-btn--lg" onClick={onSendReply} disabled={sending || !replyText.trim()}>
                            {sending ? <><span className="cmp-spinner cmp-spinner--sm me-2"></span>Sending…</> : <><i className="ti ti-send me-2"></i>Send reply</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Design 2 — matches AdminListingsPage ViewModal aesthetic
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,.22)', width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0, background: '#fafbfc' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                <div className='p-3' >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.3rem' }}>
                        <div className='d-flex justify-content align-items-center' >
                            <label className='cmp-card__from-name me-2' >Full Name : </label>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{message.name}</span>
                            {/* <StatusBadge status={message.status} design={2} /> */}
                            {message.replies && message.replies.length > 0 && (
                                <span style={{ fontSize: '.7rem', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 20 }}>
                                    {message.replies.length} repl{message.replies.length > 1 ? 'ies' : 'y'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className='d-flex justify-content align-items-center' >
                        <code style={{ fontSize: '.75rem', color: '#475569' }} className='me-2' >Email : </code>
                        <code style={{ fontSize: '.75rem', color: '#475569' }}>{message.email}</code>
                    </div>
                </div>
                {/* Meta grid */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.4rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '1.1rem' }}>
                        {[['Received', new Date(message.createdAt).toLocaleDateString()], ['Site', message.site ?? '—'], ['Time', new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })],
                            // ['Replies', String(message.replies?.length ?? 0)]
                        ]
                            .map(([label, value]) => (
                                <div key={label} style={{ background: '#f8fafd', borderRadius: 10, padding: '.55rem .8rem', border: '1px solid #e8edf4' }}>
                                    <div style={{ fontSize: '.63rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.2rem' }}>{label}</div>
                                    <div style={{ fontSize: '.86rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                                </div>
                            ))}
                    </div>
                    <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .3rem' }}>Subject</p>
                    <p style={{ fontWeight: 600, fontSize: '.92rem', color: '#0f172a', marginBottom: '1rem' }}>{message.subject}</p>
                    <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .3rem' }}>Message</p>
                    <div style={{ padding: '.85rem 1rem', background: '#f8fafd', borderRadius: 10, border: '1px solid #e8edf4', marginBottom: '1rem', fontSize: '.88rem', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: message.message }} />
                    {message.replies && message.replies.length > 0 && (
                        <>
                            <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Previous replies</p>
                            {message.replies.map(r => (
                                <div key={r.id} style={{ padding: '.75rem 1rem', background: '#eff6ff', borderRadius: 10, border: '1.5px solid #bfdbfe', marginBottom: '.5rem' }}>
                                    <div style={{ fontSize: '.85rem' }} dangerouslySetInnerHTML={{ __html: r.message }} />
                                    <small style={{ color: '#64748b' }}>{new Date(r.createdAt).toLocaleString()}</small>
                                </div>
                            ))}
                        </>
                    )}
                    <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Reply</p>
                    <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                        onInit={(_e, ed) => (editorRef.current = ed)}
                        onEditorChange={setReplyText} initialValue="" init={tinymceConfig} />
                </div>
                <div style={{ padding: '.8rem 1.4rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '.75rem', flexShrink: 0, background: '#fafbfc' }}>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={onSendReply} disabled={sending || !replyText.trim()}>
                        {sending ? <><span className="spinner-border spinner-border-sm me-1" />Sending…</> : <><i className="ti ti-send me-1" />Send reply</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Design 1: Message Card ────────────────────────────────────
function MessageCard({ item, onView, onMarkRead }: {
    item: ContactMessageItem;
    onView: (i: ContactMessageItem) => void;
    onMarkRead: (id: string) => void;
}) {
    const preview = item.message.replace(/<[^>]*>/g, '').slice(0, 120);
    return (
        <div className={`cmp-card ${item.status === 'unread' ? 'cmp-card--unread' : ''}`}>
            <div className="cmp-card__body">
                <div className="cmp-card__top">
                    <div style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                            <span className="cmp-card__from-name">{item.name}</span>
                            <span className="cmp-card__email">{item.email}</span>
                        </div>
                        <h3 className="cmp-card__subject">{item.subject}</h3>
                        <p className="cmp-card__preview">{preview}{preview.length === 120 ? '…' : ''}</p>
                    </div>
                    <div className="cmp-card__badges">
                        <StatusBadge status={item.status} design={1} />
                        {item.replies && item.replies.length > 0 && (
                            <span className="cmp-badge cmp-badge--replies">
                                <i className="ti ti-message me-1"></i>{item.replies.length} repl{item.replies.length > 1 ? 'ies' : 'y'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="cmp-card__meta">
                    <div className="cmp-card__stat">
                        <span className="cmp-card__stat-label">Received</span>
                        <span className="cmp-card__stat-value">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="cmp-card__stat">
                        <span className="cmp-card__stat-label">Time</span>
                        <span className="cmp-card__stat-value">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="cmp-card__stat">
                        <span className="cmp-card__stat-label">Replies</span>
                        <span className="cmp-card__stat-value">{item.replies?.length ?? 0}</span>
                    </div>
                </div>
                <div className="cmp-card__footer">
                    <span className="cmp-card__date">{new Date(item.createdAt).toLocaleString()}</span>
                    <div className="d-flex gap-2">
                        {item.status === 'unread' && (
                            <button className="cmp-btn cmp-btn--secondary cmp-btn--sm" onClick={() => onMarkRead(item.id)}>
                                <i className="ti ti-check me-1"></i>Mark read
                            </button>
                        )}
                        <button className="cmp-btn cmp-btn--edit" onClick={() => onView(item)}>
                            <i className="ti ti-eye me-1"></i>View &amp; reply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="cmp-card cmp-card--skeleton">
            <div className="cmp-card__body" style={{ gap: '.75rem' }}>
                {[30, 60, 80, 40].map((w, i) => (
                    <div key={i} className="cmp-skel" style={{ height: i === 1 ? 18 : 14, width: `${w}%`, borderRadius: 6 }}></div>
                ))}
            </div>
        </div>
    );
}

// ─── Design 2: Table skeleton row ─────────────────────────────
function SkeletonRow() {
    return (
        <tr>
            {[100, 160, 180, 90, 70, 40, 80, 60].map((w, i) => (
                <td key={i} className="py-3">
                    <div style={{ height: 14, borderRadius: 4, width: w, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'tbl-shimmer 1.4s infinite' }} />
                </td>
            ))}
        </tr>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function ContactMessagesAdminPage() {
    const [design, setDesign] = useState<1 | 2>(2);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [messages, setMessages] = useState<ContactMessageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessageItem | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [siteFilter, setSiteFilter] = useState('');
    const editorRef = useRef<any>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 10;
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            if (siteFilter) params.set('site', siteFilter);
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            const res = await fetch(`/api/contact?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setMessages(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMessages(); }, [page, search, statusFilter, siteFilter, dateFrom, dateTo]);

    const handleOpenModal = async (item: ContactMessageItem) => {
        try {
            const res = await fetch(`/api/contact/${item.id}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setSelectedMessage(data.data);
            setReplyText('');
            setShowModal(true);
        } catch (err: any) { alert(err.message); }
    };

    const handleCloseModal = () => { setShowModal(false); setSelectedMessage(null); };

    const handleSendReply = async () => {
        const content = editorRef.current?.getContent() || replyText;
        if (!content.trim() || !selectedMessage) return;
        setSendingReply(true);
        try {
            const res = await fetch(`/api/contact/${selectedMessage.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: content }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
            await fetchMessages();
            handleCloseModal();
        } catch (err: any) { alert(err.message); }
        finally { setSendingReply(false); }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/contact/${id}/read`, { method: 'PATCH' });
            if (!res.ok) throw new Error('Failed');
            await fetchMessages();
        } catch (err: any) { alert(err.message); }
    };

    const activeFilterCount = [search, statusFilter, siteFilter, dateFrom, dateTo].filter(Boolean).length;
    const clearFilters = () => { setSearch(''); setStatusFilter(''); setSiteFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };

    // ── Shared header (identical across both designs) ──────────
    const SharedHeader = () => (
        <div className="d-flex flex-wrap justify-content-between align-items-start mb-0 p-3 bg-white border-bottom shadow-sm gap-3">
            <div className="container-fluid gap-2">
                <div className="cmp__header-inner w-100 d-flex flex-wrap justify-content-between mb-3 align-items-center">
                    <div>
                        <h1 className="mb-1 fw-semibold" style={{ fontSize: '1.5rem' }}>Inquiry Messages</h1>
                        <p className="text-muted small mb-0">{total} message{total !== 1 ? 's' : ''} found</p>
                    </div>
                    {/* Design toggle pill — top right */}
                    {/* <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '.75rem', color: 'rgba(0, 0, 0, 0.65)', fontWeight: 500 }}>View</span>
                        <div style={{ display: 'flex', background: 'rgba(221, 221, 221, 0.61)', borderRadius: 10, padding: 3, gap: 3 }}>
                            {([
                                [1, 'ti-layout-cards', 'Cards'],
                                [2, 'ti-table', 'Table'],
                            ] as const).map(([d, icon, label]) => (
                                <button key={d} onClick={() => setDesign(d)} title={`${label} view`}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '5px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                        fontSize: '.78rem', fontWeight: 600, transition: 'all .18s',
                                        background: design === d ? '#00000051' : 'transparent',
                                        color: design === d ? '#376fe6' : 'rgba(0, 0, 0, 0.75)',
                                    }}
                                >
                                    <i className={`ti ${icon}`} style={{ fontSize: 14 }}></i>{label}
                                </button>
                            ))}
                        </div>
                    </div> */}
                </div>
                <div className="cmp-filters bg-white rounded-3 p-2 mt-2 border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {/* Mobile toggle */}
                    <button
                        className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1 mb-0"
                        style={{ fontSize: 13 }}
                        onClick={() => setMobileOpen(o => !o)}
                    >
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFilterCount > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                                    {activeFilterCount}
                                </span>
                            )}
                            <i
                                className="ti ti-chevron-down"
                                style={{
                                    fontSize: 14,
                                    transition: 'transform 0.2s',
                                    transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                            ></i>
                        </span>
                    </button>

                    {/* Desktop row */}
                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        {/* Status buttons */}
                        <div className="d-flex rounded-2 p-1 gap-1" style={{ background: '#f3f3f1' }}>
                            {(['all', 'unread', 'read', 'replied'] as const).map(s => (
                                <button
                                    key={s}
                                    className="btn btn-sm border-0 d-flex align-items-center gap-1 px-3"
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 500,
                                        height: 28,
                                        borderRadius: 5,
                                        background: (statusFilter === s || (s === 'all' && !statusFilter)) ? '#fff' : 'transparent',
                                        color: (statusFilter === s || (s === 'all' && !statusFilter)) ? '#534AB7' : '#888',
                                        boxShadow: (statusFilter === s || (s === 'all' && !statusFilter)) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                        whiteSpace: 'nowrap',
                                    }}
                                    onClick={() => { setStatusFilter(s === 'all' ? '' : s); setPage(1); }}
                                >
                                    <i className={`ti ${s === 'all' ? 'ti-inbox' : s === 'unread' ? 'ti-mail' : s === 'replied' ? 'ti-send' : 'ti-mail-opened'}`} style={{ fontSize: 12 }}></i>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }}></div>

                        {/* Site dropdown */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                            <select
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 130, height: '100%', cursor: 'pointer' }}
                                value={siteFilter}
                                onChange={e => { setSiteFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Sites</option>
                                {['jobs-connect.vercel.app', 'new-jobs-fawn.vercel.app', 'jobsrefugee.ca',
                                    'vulnerableyouthsjobs.ca', 'accesscareers.ca', 'indigenouspeoplesjobs.ca'
                                ].map(site => (
                                    <option key={site} value={site}>
                                        {site.replace('.ca', '').replace('.vercel.app', '')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }}></div>

                        {/* Search */}
                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 190, fontSize: 12, outline: 'none' }}
                                placeholder="Search name, email, subject…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div> */}

                        {/* Date range */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="date" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={dateFrom}
                                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                            />
                            <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                            <input type="date" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={dateTo}
                                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                            />
                        </div>

                        {/* Clear button */}
                        {activeFilterCount > 0 && (
                            <button
                                className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6, whiteSpace: 'nowrap' }}
                                onClick={clearFilters}
                            >
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear
                            </button>
                        )}
                    </div>

                    {/* Mobile panel */}
                    <div className="d-md-none w-100 overflow-hidden" style={{ maxHeight: mobileOpen ? 480 : 0, transition: 'max-height 0.28s ease' }}>
                        <div className="d-flex flex-column gap-2 pt-2 mt-1" style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)' }}>
                            {/* Status buttons */}
                            <div className="d-flex rounded-2 p-1 gap-1" style={{ background: '#f3f3f1' }}>
                                {(['all', 'unread', 'read', 'replied'] as const).map(s => (
                                    <button key={s} className="btn btn-sm border-0 flex-fill d-flex align-items-center justify-content-center"
                                        style={{ fontSize: 11, fontWeight: 500, height: 30, borderRadius: 5, background: (statusFilter === s || (s === 'all' && !statusFilter)) ? '#fff' : 'transparent', color: (statusFilter === s || (s === 'all' && !statusFilter)) ? '#534AB7' : '#888' }}
                                        onClick={() => { setStatusFilter(s === 'all' ? '' : s); setPage(1); }}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Site dropdown (mobile) */}
                            <div className="d-flex align-items-center rounded-2 px-2 gap-2 w-100" style={{ height: 38, background: '#f3f3f1' }}>
                                <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                                <select
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', height: '100%' }}
                                    value={siteFilter}
                                    onChange={e => { setSiteFilter(e.target.value); setPage(1); }}
                                >
                                    <option value="">All Sites</option>
                                    {['jobs-connect.vercel.app', 'new-jobs-fawn.vercel.app', 'jobsrefugee.ca',
                                        'vulnerableyouthsjobs.ca', 'accesscareers.ca', 'indigenouspeoplesjobs.ca'
                                    ].map(site => (
                                        <option key={site} value={site}>
                                            {site.replace('.ca', '').replace('.vercel.app', '')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search */}
                            <div className="d-flex align-items-center rounded-2 px-2 gap-2 w-100" style={{ height: 38, background: '#f3f3f1' }}>
                                <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                                <input type="text" className="border-0 bg-transparent p-0 shadow-none flex-fill" style={{ fontSize: 13, outline: 'none' }}
                                    placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                            </div>

                            {/* Date range */}
                            <div className="d-flex align-items-center rounded-2 px-2 gap-1 w-100" style={{ height: 38, background: '#f3f3f1' }}>
                                <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                                <input type="date" className="border-0 bg-transparent p-0 shadow-none flex-fill" style={{ fontSize: 13, outline: 'none' }} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                                <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                                <input type="date" className="border-0 bg-transparent p-0 shadow-none flex-fill" style={{ fontSize: 13, outline: 'none' }} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
                            </div>

                            {/* Clear (mobile) */}
                            {activeFilterCount > 0 && (
                                <button className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-secondary border"
                                    style={{ fontSize: 13, height: 38, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }} onClick={clearFilters}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    // ══════════════════════════════════════════════════════════
    // DESIGN 1 — Card layout (MyListingsPage style)
    // ══════════════════════════════════════════════════════════
    if (design === 1) return (
        <section className="cmp bg-transparent">
            <SharedHeader />
            <div className="container cmp__body">
                {error && (
                    <div className="cmp-alert cmp-alert--error mt-3">
                        <i className="ti ti-alert-circle me-2"></i>{error}
                        <button className="cmp-btn cmp-btn--ghost ms-2" onClick={fetchMessages}>Retry</button>
                    </div>
                )}
                {loading ? (
                    <div className="cmp-cards mt-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                ) : messages.length === 0 ? (
                    <div className="cmp-empty mt-3">
                        <div className="cmp-empty__icon"><i className="ti ti-inbox"></i></div>
                        <h3>{activeFilterCount > 0 ? 'No messages match your filters' : 'No messages yet'}</h3>
                        <p>{activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Contact form submissions will appear here.'}</p>
                    </div>
                ) : (
                    <>
                        <div className="cmp-cards mt-3">
                            {messages.map(item => <MessageCard key={item.id} item={item} onView={handleOpenModal} onMarkRead={handleMarkAsRead} />)}
                        </div>
                        {totalPages > 1 && (
                            <div className="cmp-pagination">
                                <button className="cmp-btn cmp-btn--secondary" onClick={() => setPage(p => p - 1)} disabled={page === 1}><i className="ti ti-chevron-left"></i></button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                    return <button key={p} className={`cmp-btn ${page === p ? 'cmp-btn--primary' : 'cmp-btn--secondary'}`} onClick={() => setPage(p)}>{p}</button>;
                                })}
                                <button className="cmp-btn cmp-btn--secondary" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><i className="ti ti-chevron-right"></i></button>
                                <span className="cmp-pagination__info">Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</span>
                            </div>
                        )}
                    </>
                )}
            </div>
            {showModal && selectedMessage && (
                <MessageModal message={selectedMessage} onClose={handleCloseModal} onSendReply={handleSendReply}
                    sending={sendingReply} replyText={replyText} setReplyText={setReplyText} editorRef={editorRef} design={1} />
            )}
            <CMPStyles />
        </section>
    );

    // ══════════════════════════════════════════════════════════
    // DESIGN 2 — Table layout (AdminListingsPage style)
    // ══════════════════════════════════════════════════════════
    return (
        <section className="cmp bg-transparent">
            <SharedHeader />
            <div className=" cmp__body">
                {error && (
                    <div className="alert alert-danger d-flex align-items-center gap-3 mt-3">
                        <span>{error}</span>
                        <button className="btn btn-sm btn-outline-danger ms-auto" onClick={fetchMessages}>Retry</button>
                    </div>
                )}
                <div style={{ marginTop: '1.25rem', background: '#fff', borderRadius: 16, border: '1px solid #e8edf4', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    {['Name', 'Email', 'Subject', 'Site', 'Status', 'Replies', 'Date', ''].map((h, i) => (
                                        <th key={i} className="tbl-th" style={i === 6 ? { textAlign: 'right' } : {}}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                    : messages.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={7} className="text-center py-5">
                                                    <div style={{ color: '#94a3b8' }}>
                                                        <i className="ti ti-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }} />
                                                        <span style={{ fontSize: '.88rem' }}>No messages found</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                        : messages.map(item => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: item.status === 'unread' ? '#fffbeb' : undefined }}>
                                                <td style={{ fontWeight: 700, fontSize: '.85rem', color: '#0f172a' }}>{item.name}</td>
                                                <td>
                                                    <code style={{ fontSize: '.75rem', color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 4 }}>
                                                        {item.email}
                                                    </code>
                                                </td>
                                                <td style={{ maxWidth: 220 }}>
                                                    <div style={{ fontSize: '.84rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{item.subject}</div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '.72rem', fontWeight: 600, background: '#f0f9ff',
                                                        color: '#0369a1', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                                                        border: '1px solid #bae6fd'
                                                    }}>
                                                        {item.site?.replace('.ca', '').replace('.vercel.app', '') ?? '—'}
                                                    </span>
                                                </td>
                                                <td><StatusBadge status={item.status} design={2} /></td>
                                                <td style={{ fontSize: '.82rem', color: '#64748b' }}>
                                                    {item.replies?.length
                                                        ? <span style={{ fontWeight: 700, color: '#5b21b6' }}>{item.replies.length}</span>
                                                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                                                </td>
                                                <td style={{ fontSize: '.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-flex gap-1 justify-content-end">
                                                        {/* {item.status === 'unread' && (
                                                            <button className="tbl-action-btn tbl-action-btn--success" title="Mark as read" onClick={() => handleMarkAsRead(item.id)}>
                                                                <i className="ti ti-check" />
                                                            </button>
                                                        )} */}
                                                        <button className="tbl-action-btn" title="View & reply" onClick={() => handleOpenModal(item)}>
                                                            <i className="ti ti-eye" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ padding: '.75rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
                            <div className="small text-muted">Showing {messages.length} of {total} entries</div>
                            <nav>
                                <ul className="pagination pagination-sm mb-0">
                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p => p - 1)}>Prev</button>
                                    </li>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                        return <li key={p} className={`page-item ${page === p ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>;
                                    })}
                                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            </div>
            {showModal && selectedMessage && (
                <MessageModal message={selectedMessage} onClose={handleCloseModal} onSendReply={handleSendReply}
                    sending={sendingReply} replyText={replyText} setReplyText={setReplyText} editorRef={editorRef} design={2} />
            )}
            <CMPStyles />
        </section>
    );
}

// ─── Styles ────────────────────────────────────────────────────
function CMPStyles() {
    return (
        <style jsx global>{`
      :root {
        --cmp-bg:       #ffffff;
        --cmp-surface:  #ffffff;
        --cmp-border:   #e2e8f0;
        --cmp-accent:   #1a56db;
        --cmp-accent-h: #1741b6;
        --cmp-text:     #0f172a;
        --cmp-muted:    #64748b;
        --cmp-radius:   14px;
        --cmp-shadow:   0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.05);
      }
      .cmp { min-height: 100vh; padding: 2rem 0; }

      /* ── Header — identical for both designs ── */
      .cmp__header {
        background: linear-gradient(135deg, #000000 0%, #6379a7 100%);
        padding: 2rem; color: #fff; border-radius: 1rem;
      }
      .cmp__header-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .cmp__heading { font-size: clamp(1.6rem,4vw,2.2rem); font-weight: 700; margin: 0; color: #fff; }
      .cmp__subtext { font-size: .92rem; color: rgba(255,255,255,.72); margin: .4rem 0 0; }
      .cmp__body { padding: 2.5rem 0 4rem; }

      /* ── Buttons ── */
      .cmp-btn { display: inline-flex; align-items: center; justify-content: center; padding: .5rem 1.1rem; border-radius: 9px; font-weight: 400; font-size: .88rem; border: 2px solid transparent; cursor: pointer; transition: all .18s ease; white-space: nowrap; text-decoration: none; background: none; }
      .cmp-btn--primary   { background: var(--cmp-accent); color: #fff; border-color: var(--cmp-accent); }
      .cmp-btn--primary:hover:not(:disabled) { background: var(--cmp-accent-h); border-color: var(--cmp-accent-h); }
      .cmp-btn--secondary { background: transparent; color: var(--cmp-text); border-color: var(--cmp-border); border-width: 1.5px; }
      .cmp-btn--secondary:hover:not(:disabled) { background: var(--cmp-bg); }
      .cmp-btn--edit { background: transparent; color: var(--cmp-accent); border-color: var(--cmp-accent); border-width: 1.5px; font-size: .8rem; padding: .35rem .85rem; }
      .cmp-btn--edit:hover:not(:disabled) { background: var(--cmp-accent); color: #fff; }
      .cmp-btn--ghost { background: none; border: none; color: inherit; padding: .25rem .5rem; }
      .cmp-btn--sm  { padding: .3rem .7rem; font-size: .8rem; }
      .cmp-btn--lg  { padding: .7rem 1.6rem; font-size: .95rem; }
      .cmp-btn:disabled { opacity: .55; cursor: not-allowed; }

      /* ── Alert ── */
      .cmp-alert { display: flex; align-items: center; padding: .9rem 1.2rem; border-radius: var(--cmp-radius); margin-bottom: 1.5rem; font-size: .9rem; font-weight: 500; }
      .cmp-alert--error { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }

      /* ── Cards (Design 1) ── */
      .cmp-cards { display: flex; flex-direction: column; gap: 1.25rem; }
      .cmp-card { background: var(--cmp-surface); border-radius: var(--cmp-radius); box-shadow: var(--cmp-shadow); border: 1.5px solid var(--cmp-border); display: flex; overflow: hidden; transition: box-shadow .2s; }
      .cmp-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,.1); }
      .cmp-card--unread { border-color: #3b82f6; border-left-width: 4px; }
      .cmp-card--skeleton { opacity: .6; }
      .cmp-skel { background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 200% 100%; animation: cmp-shimmer 1.4s infinite; }
      @keyframes cmp-shimmer { to { background-position: -200% 0; } }
      .cmp-card__body { flex: 1; padding: 1.1rem 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
      .cmp-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; flex-wrap: wrap; }
      .cmp-card__from-name { font-size: .88rem; font-weight: 700; color: var(--cmp-text); }
      .cmp-card__email { font-size: .75rem; color: var(--cmp-muted); font-family: monospace; background: #f1f5f9; border: 1px solid #e2e8f0; padding: .15rem .5rem; border-radius: 5px; }
      .cmp-card__subject { font-size: 1rem; font-weight: 700; color: var(--cmp-text); margin: 0; }
      .cmp-card__preview { font-size: .82rem; color: var(--cmp-muted); margin: .15rem 0 0; line-height: 1.5; }
      .cmp-card__badges { display: flex; flex-wrap: wrap; gap: .35rem; }
      .cmp-card__meta { display: flex; gap: 1.5rem; flex-wrap: wrap; padding: .6rem; background: #f8fafc; border-radius: 8px; }
      .cmp-card__stat { display: flex; flex-direction: column; gap: .1rem; }
      .cmp-card__stat-label { font-size: .7rem; color: var(--cmp-muted); text-transform: uppercase; letter-spacing: .05em; }
      .cmp-card__stat-value { font-size: .88rem; font-weight: 700; color: var(--cmp-text); }
      .cmp-card__footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; margin-top: auto; }
      .cmp-card__date { font-size: .78rem; color: var(--cmp-muted); }

      /* ── Badges ── */
      .cmp-badge { display: inline-flex; align-items: center; font-size: .72rem; font-weight: 700; padding: .22rem .65rem; border-radius: 20px; white-space: nowrap; }
      .cmp-badge--unread  { background: #fef3c7; color: #92400e; }
      .cmp-badge--read    { background: #f1f5f9; color: #475569; }
      .cmp-badge--replied { background: #d1fae5; color: #065f46; }
      .cmp-badge--replies { background: #ede9fe; color: #5b21b6; }

      /* ── Empty ── */
      .cmp-empty { text-align: center; padding: 4rem 2rem; color: var(--cmp-muted); }
      .cmp-empty__icon { font-size: 3.5rem; color: var(--cmp-accent); opacity: .25; margin-bottom: 1rem; }
      .cmp-empty h3 { color: var(--cmp-text); font-size: 1.2rem; }

      /* ── Pagination (Design 1) ── */
      .cmp-pagination { display: flex; align-items: center; justify-content: center; gap: .4rem; margin-top: 2rem; flex-wrap: wrap; }
      .cmp-pagination__info { font-size: .8rem; color: var(--cmp-muted); margin-left: .5rem; }

      /* ── Spinner ── */
      .cmp-spinner { display: inline-block; width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: cmp-spin .7s linear infinite; }
      .cmp-spinner--sm { width: 14px; height: 14px; border-width: 2px; }
      @keyframes cmp-spin { to { transform: rotate(360deg); } }

      /* ── Modal (Design 1) ── */
      .cmp-modal { background: var(--cmp-surface); border-radius: var(--cmp-radius); box-shadow: 0 20px 60px rgba(0,0,0,.2); border: 1.5px solid var(--cmp-border); width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
      .cmp-modal__header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.5rem; border-bottom: 1.5px solid var(--cmp-border); flex-shrink: 0; }
      .cmp-modal__email { font-size: .8rem; color: var(--cmp-muted); font-family: monospace; margin: 0; }
      .cmp-modal__body { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
      .cmp-modal__subject p { font-size: .95rem; font-weight: 400; color: var(--cmp-text); margin: .3rem 0 0; }
      .cmp-modal__bubble { background: #f8fafc; border-radius: 10px; padding: 1rem 1.1rem; font-size: .88rem; color: var(--cmp-text); line-height: 1.6; border: 1.5px solid var(--cmp-border); }
      .cmp-modal__replies { display: flex; flex-direction: column; gap: .6rem; }
      .cmp-modal__reply-bubble { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: .85rem 1rem; font-size: .85rem; color: var(--cmp-text); }
      .cmp-modal__reply-date { display: block; font-size: .72rem; color: var(--cmp-muted); margin-top: .4rem; }
      .cmp-modal__reply-form { display: flex; flex-direction: column; gap: .4rem; }
      .cmp-modal__footer { display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1.5px solid var(--cmp-border); flex-shrink: 0; background: var(--cmp-surface); }
      .cmp-label { font-size: .78rem; font-weight: 700; color: var(--cmp-muted); text-transform: uppercase; letter-spacing: .05em; display: block; }

      /* ── Table (Design 2) ── */
      .tbl-th {
        background: #f2f6fb !important; color: #334155;
        font-weight: 700; font-size: .75rem;
        text-transform: uppercase; letter-spacing: .04em;
        border-bottom: 2px solid #2563eb !important;
        padding: .75rem .85rem; white-space: nowrap;
      }
      .tbl-action-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #e2e8f0;
        background: #fff; cursor: pointer; font-size: .82rem; color: #64748b;
        transition: all .15s;
      }
      .tbl-action-btn:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
      .tbl-action-btn--success:hover { border-color: #22c55e; color: #22c55e; background: #f0fdf4; }
      @keyframes tbl-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

      @media (max-width: 640px) {
        .cmp-card { flex-direction: column; }
        .cmp__header-inner { flex-direction: column; align-items: flex-start; }
        .cmp-card__meta { gap: 1rem; }
      }
    `}</style>
    );
}