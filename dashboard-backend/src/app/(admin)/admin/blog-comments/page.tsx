'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────
interface BlogCommentItem {
    id: string;
    blogSlug: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    isApproved: boolean;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    data: BlogCommentItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
    const colors = [
        '#3b82f6', '#5b50e1', '#ec4899', '#f59e0b',
        '#10b981', '#06b6d4', '#f97316', '#6366f1',
    ];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div style={{
            width: 38, height: 38, borderRadius: '50%', background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
            userSelect: 'none',
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

// ─── Inline edit textarea ─────────────────────────────────────
function InlineEdit({
    comment,
    onSave,
    onCancel,
}: {
    comment: BlogCommentItem;
    onSave: (message: string) => Promise<void>;
    onCancel: () => void;
}) {
    const [val, setVal] = useState(comment.message);
    const [saving, setSaving] = useState(false);
    return (
        <div style={{ marginTop: '.5rem' }}>
            <textarea
                className="form-control form-control-sm"
                rows={3}
                value={val}
                onChange={e => setVal(e.target.value)}
                style={{ fontSize: '.875rem', resize: 'vertical' }}
                autoFocus
            />
            <div className="d-flex gap-2 mt-2">
                <button
                    className="btn btn-sm btn-primary"
                    disabled={saving || !val.trim()}
                    onClick={async () => {
                        setSaving(true);
                        await onSave(val.trim());
                        setSaving(false);
                    }}
                >
                    {saving
                        ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                        : 'Save'}
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

// ─── Single comment card ──────────────────────────────────────
function CommentCard({
    comment,
    parentComment,
    selected,
    onSelect,
    onApprove,
    onUnapprove,
    onDelete,
    onEdit,
}: {
    comment: BlogCommentItem;
    parentComment?: BlogCommentItem;
    selected: boolean;
    onSelect: () => void;
    onApprove: () => void;
    onUnapprove: () => void;
    onDelete: () => void;
    onEdit: (message: string) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [actionsVisible, setActionsVisible] = useState(false);

    const timeAgo = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        if (d < 30) return `${d}d ago`;
        return new Date(iso).toLocaleDateString();
    };

    return (
        <div
            style={{
                display: 'flex', gap: '1rem', padding: '1rem 1.25rem',
                background: selected ? '#f0f7ff' : comment.isApproved ? '#fff' : '#fffbeb',
                borderLeft: `3px solid ${comment.isApproved ? 'transparent' : '#f59e0b'}`,
                transition: 'background .15s',
            }}
            onMouseEnter={() => setActionsVisible(true)}
            onMouseLeave={() => setActionsVisible(false)}
        >
            {/* Checkbox */}
            <div style={{ paddingTop: 3 }}>
                <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selected}
                    onChange={onSelect}
                    style={{ cursor: 'pointer' }}
                />
            </div>

            {/* Avatar */}
            <Avatar name={comment.name} />

            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem .75rem', marginBottom: '.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#0f172a' }}>{comment.name}</span>
                    <a href={`mailto:${comment.email}`} style={{ fontSize: '.78rem', color: '#64748b', textDecoration: 'none' }}>
                        {comment.email}
                    </a>
                    {comment.phone && (
                        <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>{comment.phone}</span>
                    )}
                    <span style={{ fontSize: '.75rem', color: '#94a3b8', marginLeft: 'auto' }}>{timeAgo(comment.createdAt)}</span>
                </div>

                {/* Post + type tags */}
                <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '.72rem', background: '#f1f5f9', color: '#475569',
                        borderRadius: 4, padding: '1px 7px', border: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        <i className="ti ti-file-text" style={{ fontSize: 11 }} />
                        {comment.blogSlug}
                    </span>
                    {comment.parentId && (
                        <span style={{
                            fontSize: '.72rem', background: '#ede9fe', color: '#6d28d9',
                            borderRadius: 4, padding: '1px 7px', border: '1px solid #ddd6fe',
                        }}>
                            ↩ reply
                        </span>
                    )}
                    {!comment.isApproved && (
                        <span style={{
                            fontSize: '.72rem', background: '#fef3c7', color: '#92400e',
                            borderRadius: 4, padding: '1px 7px', border: '1px solid #fde68a',
                        }}>
                            pending
                        </span>
                    )}
                </div>

                {/* Parent quote (if reply) */}
                {parentComment && (
                    <div style={{
                        fontSize: '.8rem', color: '#64748b', borderLeft: '3px solid #cbd5e1',
                        paddingLeft: '.6rem', marginBottom: '.5rem', fontStyle: 'italic',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                        <strong>{parentComment.name}:</strong> {parentComment.message}
                    </div>
                )}

                {/* Message */}
                {editing ? (
                    <InlineEdit
                        comment={comment}
                        onSave={async (msg) => { await onEdit(msg); setEditing(false); }}
                        onCancel={() => setEditing(false)}
                    />
                ) : (
                    <p style={{
                        margin: 0, fontSize: '.875rem', color: '#334155',
                        lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                        {comment.message}
                    </p>
                )}

                {/* Action bar */}
                {!editing && (
                    <div style={{
                        display: 'flex', gap: '.35rem', marginTop: '.65rem', flexWrap: 'wrap',
                        opacity: actionsVisible ? 1 : 0,
                        transition: 'opacity .15s',
                    }}>
                        {!comment.isApproved ? (
                            <button
                                className="btn btn-sm"
                                style={{ fontSize: '.75rem', padding: '2px 10px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 5, fontWeight: 600 }}
                                onClick={onApprove}
                            >
                                <i className="ti ti-check me-1" />Approve
                            </button>
                        ) : (
                            <button
                                className="btn btn-sm"
                                style={{ fontSize: '.75rem', padding: '2px 10px', background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a', borderRadius: 5, fontWeight: 600 }}
                                onClick={onUnapprove}
                            >
                                <i className="ti ti-arrow-back-up me-1" />Unapprove
                            </button>
                        )}
                        <button
                            className="btn btn-sm"
                            style={{ fontSize: '.75rem', padding: '2px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 5 }}
                            onClick={() => setEditing(true)}
                        >
                            <i className="ti ti-pencil me-1" />Edit
                        </button>
                        <button
                            className="btn btn-sm"
                            style={{ fontSize: '.75rem', padding: '2px 10px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: 5, fontWeight: 600 }}
                            onClick={onDelete}
                        >
                            <i className="ti ti-trash me-1" />Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function BlogCommentsAdminPage() {
    const [comments, setComments] = useState<BlogCommentItem[]>([]);
    const [allComments, setAllComments] = useState<BlogCommentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [tab, setTab] = useState<'pending' | 'approved' | 'all'>('pending');
    const [tabCounts, setTabCounts] = useState({ pending: 0, approved: 0, all: 0 });

    const [search, setSearch] = useState('');
    const [slugFilter, setSlugFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const perPage = 20;

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [bulkWorking, setBulkWorking] = useState(false);

    // ── Fetch ────────────────────────────────────────────────
    const fetchComments = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            params.set('sortBy', 'createdAt');
            params.set('sortOrder', tab === 'pending' ? 'asc' : 'desc');
            if (search) params.set('search', search);
            if (slugFilter) params.set('slug', slugFilter);
            if (tab === 'pending') params.set('isApproved', 'false');
            if (tab === 'approved') params.set('isApproved', 'true');

            const [res, pendingRes, approvedRes, allRes] = await Promise.all([
                fetch(`/api/admin/blog-comments?${params}`),
                fetch('/api/admin/blog-comments?isApproved=false&page=1&perPage=1'),
                fetch('/api/admin/blog-comments?isApproved=true&page=1&perPage=1'),
                fetch('/api/admin/blog-comments?page=1&perPage=1'),
            ]);

            if (!res.ok) throw new Error('Failed to fetch comments');
            const json: ApiResponse = await res.json();
            const pJson = await pendingRes.json();
            const aJson = await approvedRes.json();
            const allJson = await allRes.json();

            setComments(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
            setTabCounts({ pending: pJson.total, approved: aJson.total, all: allJson.total });
            setSelectedIds([]); setSelectAll(false);

            // Fetch for parent comment lookup
            const parentRes = await fetch('/api/admin/blog-comments?page=1&perPage=200&sortBy=createdAt&sortOrder=desc');
            if (parentRes.ok) {
                const parentJson: ApiResponse = await parentRes.json();
                setAllComments(parentJson.data);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, perPage, tab, search, slugFilter]);

    useEffect(() => {
        const t = setTimeout(fetchComments, 300);
        return () => clearTimeout(t);
    }, [fetchComments]);

    useEffect(() => { setPage(1); }, [tab, search, slugFilter]);

    // ── Actions ───────────────────────────────────────────────
    const apiUpdate = async (id: string, blogSlug: string, patch: object) => {
        const res = await fetch(`/api/admin/blog-comments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blogSlug, ...patch }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
    };

    const handleApprove = async (comment: BlogCommentItem) => {
        try { await apiUpdate(comment.id, comment.blogSlug, { isApproved: true }); await fetchComments(); }
        catch (e: any) { alert(e.message); }
    };

    const handleUnapprove = async (comment: BlogCommentItem) => {
        try { await apiUpdate(comment.id, comment.blogSlug, { isApproved: false }); await fetchComments(); }
        catch (e: any) { alert(e.message); }
    };

    const handleEdit = async (comment: BlogCommentItem, message: string) => {
        try { await apiUpdate(comment.id, comment.blogSlug, { message }); await fetchComments(); }
        catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (comment: BlogCommentItem) => {
        if (!confirm('Delete this comment?')) return;
        try {
            const res = await fetch(`/api/admin/blog-comments/${comment.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blogSlug: comment.blogSlug }),
            });
            if (!res.ok) throw new Error('Delete failed');
            await fetchComments();
        } catch (e: any) { alert(e.message); }
    };

    // ── Bulk ──────────────────────────────────────────────────
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedIds([]); setSelectAll(false); }
        else { setSelectedIds(comments.map(c => c.id)); setSelectAll(true); }
    };
    const toggleRow = (id: string) => setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        setSelectAll(next.length === comments.length && comments.length > 0);
        return next;
    });

    const handleBulkAction = async (action: 'approve' | 'unapprove' | 'delete') => {
        if (!selectedIds.length) return;
        if (action === 'delete' && !confirm(`Delete ${selectedIds.length} comment(s)?`)) return;
        setBulkWorking(true);
        try {
            const firstComment = comments.find(c => selectedIds.includes(c.id));
            const res = await fetch('/api/admin/blog-comments/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ids: selectedIds, blogSlug: firstComment?.blogSlug }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Bulk action failed');
            await fetchComments();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBulkWorking(false);
        }
    };

    const TABS: { key: 'pending' | 'approved' | 'all'; label: string; icon: string }[] = [
        { key: 'pending', label: 'Pending', icon: 'ti-clock' },
        { key: 'approved', label: 'Approved', icon: 'ti-circle-check' },
        { key: 'all', label: 'All comments', icon: 'ti-messages' },
    ];

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>

            {/* ── Header ──────────────────────────────────── */}
            <div className="mb-4">
                <h4 className="mb-1 fw-semibold">Comments</h4>
                <p className="text-muted small mb-0">Moderate and manage blog post comments</p>
            </div>

            {/* ── Main panel ──────────────────────────────── */}
            <div className="bg-white border rounded-3 shadow-sm overflow-hidden">

                {/* Tab bar + search */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div style={{ display: 'flex' }}>
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    padding: '.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
                                    fontSize: '.85rem', fontWeight: tab === t.key ? 700 : 400,
                                    color: tab === t.key ? '#1a56db' : '#64748b',
                                    borderBottom: tab === t.key ? '2.5px solid #1a56db' : '2.5px solid transparent',
                                    display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap',
                                }}
                            >
                                <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
                                {t.label}
                                {tabCounts[t.key] > 0 && (
                                    <span style={{
                                        background: t.key === 'pending' ? '#fef3c7' : '#e0e7ff',
                                        color: t.key === 'pending' ? '#92400e' : '#3730a3',
                                        borderRadius: 10, padding: '1px 7px', fontSize: '.7rem', fontWeight: 700,
                                        border: t.key === 'pending' ? '1px solid #fde68a' : '1px solid #c7d2fe',
                                    }}>
                                        {tabCounts[t.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search inputs */}
                    <div style={{ display: 'flex', gap: '.5rem', padding: '.5rem 0', flexWrap: 'wrap' }}>
                        {[
                            { icon: 'ti-search', value: search, setter: setSearch, placeholder: 'Search name, email, message…', width: 200 },
                            { icon: 'ti-file-text', value: slugFilter, setter: setSlugFilter, placeholder: 'Filter by post slug…', width: 150 },
                        ].map(({ icon, value, setter, placeholder, width }) => (
                            <div key={placeholder}
                                className="d-flex align-items-center rounded-2 px-2 gap-1"
                                style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <i className={`ti ${icon} text-secondary`} style={{ fontSize: 13 }} />
                                <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                    style={{ width, fontSize: 12, outline: 'none' }}
                                    placeholder={placeholder}
                                    value={value} onChange={e => setter(e.target.value)} />
                                {value && (
                                    <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', fontSize: 13, lineHeight: 1 }}
                                        onClick={() => setter('')}>×</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bulk action bar */}
                {selectedIds.length > 0 ? (
                    <div style={{
                        padding: '.6rem 1.25rem', background: '#eff6ff',
                        borderBottom: '1px solid #dbeafe',
                        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: '#1e40af', fontWeight: 600, cursor: 'pointer' }}>
                            <input type="checkbox" className="form-check-input m-0" checked={selectAll} onChange={toggleSelectAll} />
                            {selectedIds.length} selected
                        </label>
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                            <button className="btn btn-sm"
                                style={{ fontSize: '.75rem', padding: '3px 12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 5, fontWeight: 600 }}
                                onClick={() => handleBulkAction('approve')} disabled={bulkWorking}>
                                <i className="ti ti-check me-1" />Approve all
                            </button>
                            <button className="btn btn-sm"
                                style={{ fontSize: '.75rem', padding: '3px 12px', background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a', borderRadius: 5, fontWeight: 600 }}
                                onClick={() => handleBulkAction('unapprove')} disabled={bulkWorking}>
                                <i className="ti ti-arrow-back-up me-1" />Unapprove all
                            </button>
                            <button className="btn btn-sm"
                                style={{ fontSize: '.75rem', padding: '3px 12px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: 5, fontWeight: 600 }}
                                onClick={() => handleBulkAction('delete')} disabled={bulkWorking}>
                                {bulkWorking
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Working…</>
                                    : <><i className="ti ti-trash me-1" />Delete all</>}
                            </button>
                        </div>
                        <button style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '.78rem', color: '#64748b', cursor: 'pointer' }}
                            onClick={() => { setSelectedIds([]); setSelectAll(false); }}>
                            Clear selection
                        </button>
                    </div>
                ) : (
                    !loading && comments.length > 0 && (
                        <div style={{ padding: '.45rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: '#94a3b8', cursor: 'pointer', width: 'fit-content' }}>
                                <input type="checkbox" className="form-check-input m-0" checked={false} onChange={toggleSelectAll} />
                                Select all on this page
                            </label>
                        </div>
                    )
                )}

                {/* Comment list */}
                {error ? (
                    <div className="alert alert-danger m-3 d-flex align-items-center gap-3">
                        <span>{error}</span>
                        <button className="btn btn-sm btn-outline-danger" onClick={fetchComments}>Retry</button>
                    </div>
                ) : loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: 16, height: 16, background: '#e9ecef', borderRadius: 3, marginTop: 3, flexShrink: 0 }} />
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e9ecef', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: 14, width: '25%', background: '#e9ecef', borderRadius: 4, marginBottom: 8 }} />
                                <div style={{ height: 11, width: '45%', background: '#f1f5f9', borderRadius: 4, marginBottom: 10 }} />
                                <div style={{ height: 13, width: '85%', background: '#f1f5f9', borderRadius: 4, marginBottom: 5 }} />
                                <div style={{ height: 13, width: '60%', background: '#f1f5f9', borderRadius: 4 }} />
                            </div>
                        </div>
                    ))
                ) : comments.length === 0 ? (
                    <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="ti ti-message-off" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '.75rem', opacity: .5 }} />
                        <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 500 }}>
                            {tab === 'pending' ? 'Inbox zero — no pending comments!' : 'No comments found'}
                        </p>
                        {(search || slugFilter) && (
                            <button className="btn btn-sm btn-outline-secondary mt-3"
                                onClick={() => { setSearch(''); setSlugFilter(''); }}>
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    comments.map((comment, idx) => {
                        const parent = comment.parentId
                            ? allComments.find(c => c.id === comment.parentId)
                            : undefined;
                        return (
                            <div key={comment.id} style={{ borderBottom: idx < comments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <CommentCard
                                    comment={comment}
                                    parentComment={parent}
                                    selected={selectedIds.includes(comment.id)}
                                    onSelect={() => toggleRow(comment.id)}
                                    onApprove={() => handleApprove(comment)}
                                    onUnapprove={() => handleUnapprove(comment)}
                                    onDelete={() => handleDelete(comment)}
                                    onEdit={(msg) => handleEdit(comment, msg)}
                                />
                            </div>
                        );
                    })
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '.75rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="small text-muted">Showing {comments.length} of {total}</span>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                    return (
                                        <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
}