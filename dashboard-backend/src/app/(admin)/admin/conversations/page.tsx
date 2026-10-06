'use client';
// app/admin/conversations/page.tsx
// Responsive three-panel layout with mobile stacking.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';

// Types (unchanged)
interface Conversation {
    id: string;
    buyerName: string;
    buyerEmail: string;
    sellerName: string;
    sellerEmail: string;
    subject: string;
    category: string;
    status: string;
    listingTitle?: string;
    orderId?: string;
    unreadByBuyer: number;
    unreadBySeller: number;
    unreadByAdmin: number;
    lastActivityAt: string;
    createdAt: string;
}

interface Message {
    _id?: string;
    content: string;
    senderRole: 'buyer' | 'seller' | 'admin';
    visibleTo: 'buyer' | 'seller' | 'both' | 'admin';
    isAdminNote: boolean;
    readByBuyer: boolean;
    readBySeller: boolean;
    readByAdmin: boolean;
    createdAt: string;
}

interface ConversationDetail extends Conversation {
    messages: Message[];
}

// Status badge style (gray/blue based)
const STATUS_BADGE_CLASS: Record<string, string> = {
    open: 'bg-primary bg-opacity-10 text-white',
    pending_buyer: 'bg-warning bg-opacity-10 text-white',
    pending_seller: 'bg-info bg-opacity-10 text-white',
    resolved: 'bg-success bg-opacity-10 text-white',
    closed: 'bg-secondary bg-opacity-10 text-white',
};

const CATEGORY_ICONS: Record<string, string> = {
    general: '💬', order: '📦', complaint: '⚠️',
    technical: '🔧', billing: '💳', other: '📝',
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

function shortTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AdminConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<ConversationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState({ totalUnreadAdmin: 0 });

    const [filters, setFilters] = useState({ status: '', category: '', search: '' });
    const [recipient, setRecipient] = useState<'buyer' | 'seller'>('buyer');
    const [isNote, setIsNote] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const editorRef = useRef<any>(null);
    const threadEndRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchConversations = useCallback(async () => {
        const q = new URLSearchParams();
        if (filters.status) q.set('status', filters.status);
        if (filters.category) q.set('category', filters.category);
        if (filters.search) q.set('search', filters.search);
        const res = await fetch(`/api/conversations?${q}`);
        const data = await res.json();
        setConversations(data.data || []);
        setStats(data.stats || { totalUnreadAdmin: 0 });
        setLoading(false);
    }, [filters]);

    useEffect(() => {
        fetchConversations();
        const t = setInterval(fetchConversations, 15000);
        return () => clearInterval(t);
    }, [fetchConversations]);

    const fetchDetail = useCallback(async (id: string) => {
        const res = await fetch(`/api/conversations/${id}`);
        const data = await res.json();
        if (res.ok) setSelected(data);
    }, []);

    useEffect(() => {
        if (!selected?.id) return;
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        pollingRef.current = setInterval(() => fetchDetail(selected.id), 5000);
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [selected?.id, selected?.messages?.length, fetchDetail]);

    const handleSelect = async (conv: Conversation) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setSelected(null);
        setEditorContent('');
        if (editorRef.current) editorRef.current.setContent('');
        await fetchDetail(conv.id);
        fetchConversations();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = editorRef.current?.getContent() || editorContent;
        if (!content.trim() || !selected) return;
        setSending(true);
        try {
            const res = await fetch(`/api/conversations/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'admin_send', content, recipient, isNote }),
            });
            if (res.ok) {
                await fetchDetail(selected.id);
                fetchConversations();
                setEditorContent('');
                editorRef.current?.setContent('');
            }
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!selected) return;
        await fetch(`/api/conversations/${selected.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_status', status }),
        });
        await fetchDetail(selected.id);
        fetchConversations();
    };

    const deleteConversation = async (id: string) => {
        if (!confirm('Delete this conversation permanently?')) return;
        await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
        if (selected?.id === id) setSelected(null);
        fetchConversations();
    };

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Color overrides to match sidebar */}
            <style jsx global>{`
                :root {
                    --bs-primary-rgb: 13, 110, 253;
                    --bs-dark: #2c3e50;
                    --bs-dark-rgb: 44, 62, 80;
                    --bs-border-color: #e9ecef;
                }
                .btn-primary {
                    background-color: #5b50e1 !important;
                    border-color: #5b50e1 !important;
                }
                .btn-primary:hover {
                    background-color: #0a58ca !important;
                    border-color: #0a58ca !important;
                }
                .btn-outline-primary {
                    color: #5b50e1 !important;
                    border-color: #5b50e1 !important;
                }
                .btn-outline-primary:hover {
                    background-color: #5b50e1 !important;
                    color: white !important;
                }
                .text-primary {
                    color: #5b50e1 !important;
                }
                .bg-primary {
                    background-color: #5b50e1 !important;
                }
                .border-primary {
                    border-color: #5b50e1 !important;
                }
                .badge.bg-primary {
                    background-color: #5b50e1 !important;
                    color: white !important;
                }
                .text-dark {
                    color: #2c3e50 !important;
                }
                .text-secondary {
                    color: #5a6a7a !important;
                }
                .border,
                .border-bottom,
                .border-top,
                .border-start,
                .border-end {
                    border-color: #e9ecef !important;
                }
                .bg-light {
                    background-color: #f4f6f9 !important;
                }
                .bg-opacity-25 {
                    --bs-bg-opacity: 0.25;
                }
                .bg-opacity-10 {
                    --bs-bg-opacity: 0.1;
                }
                .conversation-item.selected {
                    background-color: #f4f6f9 !important;
                    border-left: 3px solid #5b50e1 !important;
                }
                /* Mobile panel height adjustment */
                @media (max-width: 767.98px) {
                    .mobile-panel {
                        height: auto;
                        max-height: 60vh;
                    }
                }
            `}</style>

            <div className="vh-100 p-2 bg-light overflow-hidden">
                <div className="row g-2 h-100">
                    {/* LEFT PANEL: Filters + Buyer thread list */}
                    <div className="col-12 col-md-3 h-100 d-flex flex-column" style={{ minWidth: 0 }}>
                        <aside className="bg-white rounded-3 shadow-sm d-flex flex-column overflow-hidden h-100">
                            <div className="p-3 border-bottom bg-light bg-opacity-25 flex-shrink-0">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="ti ti-search text-secondary"></i>
                                    <input
                                        className="form-control form-control-sm border bg-white shadow-sm captilize "
                                        placeholder="Search..."
                                        value={filters.search}
                                        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                    />
                                </div>
                                <div className="d-flex gap-2">
                                    <select
                                        className="form-select form-select-sm border bg-white shadow-sm captilize"
                                        value={filters.status}
                                        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                                    >
                                        <option className='captilize'  value="">All Status</option>
                                        <option className='captilize' value="open">Open</option>
                                        <option className='captilize' value="pending_buyer">Pending Buyer</option>
                                        <option className='captilize' value="pending_seller">Pending Seller</option>
                                        <option className='captilize' value="resolved">Resolved</option>
                                        <option className='captilize' value="closed">Closed</option>
                                    </select>
                                    <select
                                        className="form-select form-select-sm border bg-white shadow-sm"
                                        value={filters.category}
                                        onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                    >
                                        <option value="">All categories</option>
                                        <option value="general">General</option>
                                        <option value="order">Order</option>
                                        <option value="complaint">Complaint</option>
                                        <option value="technical">Technical</option>
                                        <option value="billing">Billing</option>
                                    </select>
                                </div>
                                <div className="mt-2 d-flex justify-content-between small text-secondary">
                                    <span>{conversations.length} conversations</span>
                                    {stats.totalUnreadAdmin > 0 && (
                                        <span className="text-primary fw-medium">{stats.totalUnreadAdmin} Unread</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-grow-1 overflow-auto">
                                {conversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => handleSelect(conv)}
                                        className={`p-3 border-bottom cursor-pointer transition-colors conversation-item ${selected?.id === conv.id ? 'selected' : ''
                                            }`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {/* ... same conversation item content ... */}
                                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                            <div className="d-flex align-items-center gap-2 min-w-0">
                                                <div className="rounded-circle bg-primary bg-opacity-15 text-white d-flex align-items-center justify-content-center flex-shrink-0"
                                                    style={{ width: '28px', height: '28px', fontSize: '12px', fontWeight: 500 }}>
                                                    {conv.buyerName[0]?.toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="fw-medium text-dark small text-truncate captilize ">{conv.buyerName}</span>
                                                        <span className={`badge rounded-pill small fw-normal ms-2 text-nowrap ${STATUS_BADGE_CLASS[conv.status] || 'bg-light text-dark'}`}>
                                                            {conv.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <span className="text-secondary small text-truncate d-block capitilize " style={{ fontSize: '0.7rem' }}>
                                                        {CATEGORY_ICONS[conv.category]} {conv.subject}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center mt-1">
                                            <span className="text-secondary small text-truncate" style={{ fontSize: '0.7rem' }}>
                                                ↔ {conv.sellerName}
                                            </span>
                                            <span className="text-secondary small flex-shrink-0 ms-2" style={{ fontSize: '0.7rem' }}>
                                                {timeAgo(conv.lastActivityAt)}
                                            </span>
                                        </div>

                                        {conv.unreadByAdmin > 0 && (
                                            <div className="mt-1">
                                                <span className="badge bg-primary rounded-pill small text-white capitilize ">{conv.unreadByAdmin}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {conversations.length === 0 && (
                                    <div className="p-5 text-center text-secondary small capitilize ">No conversations</div>
                                )}
                            </div>
                        </aside>
                    </div>

                    {/* CENTER: Admin compose */}
                    <div className="col-12 col-md-5 h-100 d-flex flex-column" style={{ minWidth: 0 }}>
                        <section className="bg-white rounded-3 shadow-sm d-flex flex-column overflow-hidden h-100">
                            {selected ? (
                                <>
                                    <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                                        <div>
                                            <h2 className="h6 fw-semibold text-dark mb-1">{selected.subject}</h2>
                                            <p className="small text-secondary mb-0 captilize ">
                                                {selected.buyerName} ↔ {selected.sellerName}
                                                {selected.listingTitle && (
                                                    <span className="bg-light text-secondary rounded px-1 py-0 ms-2 small captilize ">{selected.listingTitle}</span>
                                                )}
                                                {selected.orderId && (
                                                    <span className="bg-light text-secondary rounded px-1 py-0 ms-1 small captilize ">#{selected.orderId}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <select
                                                className=" form-select-sm border-0 me-3 text-dark"
                                                value={selected.status}
                                                onChange={e => updateStatus(e.target.value)}
                                            >
                                                <option value="open">Open</option>
                                                <option value="pending_buyer">Pending Buyer</option>
                                                <option value="pending_seller">Pending Seller</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                            <button
                                                className="bg-transparent text-danger my-auto ms-auto w-50 p-0 m-0 border-0"
                                                onClick={() => deleteConversation(selected.id)}
                                            >
                                                <i className="ti ti-trash"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border-bottom px-4 py-2 d-flex flex-wrap align-items-center gap-0 flex-shrink-0">
                                        <span className="small text-secondary fw-medium captilize ">Send To:</span>
                                        <div className="btn-group btn-group-sm" role="group">
                                            <button
                                                onClick={() => setRecipient('buyer')}
                                                className={`btn captilize ${recipient === 'buyer' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            >
                                                → Buyer ({selected.buyerName})
                                            </button>
                                            <button
                                                onClick={() => setRecipient('seller')}
                                                className={`btn captilize ${recipient === 'seller' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            >
                                                → Seller ({selected.sellerName})
                                            </button>
                                        </div>
                                        <div className="ms-auto form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="internalNoteSwitch"
                                                checked={isNote}
                                                onChange={e => setIsNote(e.target.checked)}
                                            />
                                            <label className="form-check-label small text-secondary captilize" htmlFor="internalNoteSwitch">
                                                Internal note
                                            </label>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSend} className="flex-grow-1 d-flex flex-column overflow-hidden">
                                        <div className="flex-grow-1 overflow-auto p-4">
                                            <Editor
                                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                onInit={(_evt, editor) => (editorRef.current = editor)}
                                                onEditorChange={setEditorContent}
                                                initialValue=""
                                                init={{
                                                    height: 280,
                                                    menubar: false,
                                                    plugins: ['advlist', 'autolink', 'lists', 'link', 'charmap', 'searchreplace', 'code', 'table'],
                                                    toolbar:
                                                        'undo redo | bold italic underline | forecolor | ' +
                                                        'alignleft aligncenter alignright | bullist numlist | link | removeformat',
                                                    content_style: 'body { font-family: system-ui, sans-serif; font-size: 13px; color: #2c3e50; }',
                                                }}
                                            />
                                        </div>
                                        <div className="border-top bg-white px-4 py-3 d-flex flex-wrap align-items-center gap-3 flex-shrink-0">
                                            <button
                                                type="submit"
                                                disabled={sending}
                                                className={`btn btn-sm captilize ${isNote ? 'btn-outline-secondary' : 'btn-primary'}`}
                                            >
                                                {sending ? 'Sending…' : isNote ? 'Save note' : `Send to ${recipient}`}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setEditorContent(''); editorRef.current?.setContent(''); }}
                                                className="btn btn-sm btn-outline-secondary"
                                            >
                                                Clear
                                            </button>
                                            <p className="ms-auto small text-secondary captilize mb-0">
                                                {isNote
                                                    ? '🔒 Only Admins'
                                                    : `📧 Email ${recipient === 'buyer' ? selected.buyerEmail : selected.sellerEmail}`}
                                            </p>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-secondary gap-3">
                                    <div className="display-1">✉️</div>
                                    <p className="small mb-0 captilize ">Select a conversation</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT: Full conversation timeline */}
                    <div className="col-12 col-md-4 h-100 d-flex flex-column" style={{ minWidth: 0 }}>
                        <aside className="bg-white rounded-3 shadow-sm d-flex flex-column overflow-hidden h-100">
                            {selected ? (
                                <>
                                    <div className="bg-light bg-opacity-25 px-4 py-3 border-bottom flex-shrink-0">
                                        <p className="small fw-semibold text-dark text-uppercase mb-2">Conversation</p>
                                        <div className="d-flex justify-content-between align-items-center small text-secondary">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="rounded-circle bg-primary bg-opacity-15 text-white d-flex align-items-center justify-content-center"
                                                    style={{ width: '24px', height: '24px', fontSize: '10px', fontWeight: 500 }}>
                                                    {selected.buyerName[0]}
                                                </div>
                                                <span className="text-dark small">{selected.buyerName}</span>
                                            </div>
                                            <span className="text-secondary">↔</span>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-dark small">{selected.sellerName}</span>
                                                <div className="rounded-circle bg-success bg-opacity-15 text-white d-flex align-items-center justify-content-center"
                                                    style={{ width: '24px', height: '24px', fontSize: '10px', fontWeight: 500 }}>
                                                    {selected.sellerName[0]}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3">
                                        {selected.messages.map((msg, i) => {
                                            const isBuyerMsg = msg.senderRole === 'buyer';
                                            const isSellerMsg = msg.senderRole === 'seller';
                                            const isAdminMsg = msg.senderRole === 'admin';

                                            let align = 'center';
                                            if (isBuyerMsg) align = 'left';
                                            if (isSellerMsg) align = 'right';
                                            if (isAdminMsg && msg.visibleTo === 'buyer') align = 'left-admin';
                                            if (isAdminMsg && msg.visibleTo === 'seller') align = 'right-admin';
                                            if (isAdminMsg && msg.isAdminNote) align = 'note';

                                            const bubbleClass = (() => {
                                                switch (align) {
                                                    case 'left': return 'bg-primary bg-opacity-10 text-white rounded-start-0';
                                                    case 'right': return 'bg-success bg-opacity-10 text-white rounded-end-0';
                                                    case 'left-admin': return 'bg-white border border-primary border-opacity-25 text-white';
                                                    case 'right-admin': return 'bg-white border border-success border-opacity-25 text-white';
                                                    case 'note': return 'bg-warning bg-opacity-10 text-white fst-italic text-center';
                                                    default: return 'bg-light text-white';
                                                }
                                            })();

                                            const senderLabel =
                                                isBuyerMsg ? selected.buyerName :
                                                    isSellerMsg ? selected.sellerName :
                                                        msg.isAdminNote ? '🔒 Internal note' :
                                                            msg.visibleTo === 'buyer' ? `Admin → ${selected.buyerName}` :
                                                                msg.visibleTo === 'seller' ? `Admin → ${selected.sellerName}` :
                                                                    'Admin';

                                            const alignClass = (() => {
                                                if (align === 'right' || align === 'right-admin') return 'align-self-end text-end';
                                                if (align === 'left' || align === 'left-admin') return 'align-self-start';
                                                return 'align-self-center';
                                            })();

                                            return (
                                                <div key={msg._id || i} className={`d-flex flex-column ${alignClass}`} style={{ maxWidth: '90%' }}>
                                                    <span className="small text-secondary px-1 mb-1" style={{ fontSize: '0.7rem' }}>{senderLabel}</span>
                                                    <div
                                                        className={`rounded-3 px-3 py-2 small shadow-sm ${bubbleClass}`}
                                                        style={{ fontSize: '0.8rem' }}
                                                        dangerouslySetInnerHTML={{ __html: msg.content }}
                                                    />
                                                    <span className="small text-secondary mt-1 px-1" style={{ fontSize: '0.65rem' }}>{shortTime(msg.createdAt)}</span>
                                                </div>
                                            );
                                        })}
                                        <div ref={threadEndRef} />
                                    </div>
                                </>
                            ) : (
                                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-secondary gap-2">
                                    <div className="display-4">💬</div>
                                    <p className="small mb-0">Thread appears here</p>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </>
    );
}