'use client';
// components/shared/ChatWindow.tsx
// Bootstrap 5 version – modern chat panel with auto-resize input, message bubbles, and status pills.

import { useState, useEffect, useRef } from 'react';
import { ConversationDetail } from '@/hooks/useConversations';

// Optional: you can use Bootstrap Icons or keep inline SVGs – we'll keep SVGs for consistency.
// To use Bootstrap Icons, uncomment the import and replace SVG elements with <i> tags.
// import 'bootstrap-icons/font/bootstrap-icons.css';

interface ChatWindowProps {
    conversation: ConversationDetail;
    viewerRole: 'admin' | 'buyer' | 'seller';
    onSendReply: (content: string) => Promise<boolean>;
    sending: boolean;
    onClose?: () => void;
}

// Status pill styles (Bootstrap colour variants)
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    open: { label: 'Open', color: 'success', icon: '💬' },
    pending_buyer: { label: 'Awaiting you', color: 'warning', icon: '⏳' },
    pending_seller: { label: 'Awaiting seller', color: 'info', icon: '🕒' },
    resolved: { label: 'Resolved', color: 'primary', icon: '✅' },
    closed: { label: 'Closed', color: 'secondary', icon: '🔒' },
};

function formatMessageTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Auto-resize textarea hook (unchanged)
function useAutoResizeTextarea(ref: React.RefObject<HTMLTextAreaElement>, value: string) {
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${Math.min(ref.current.scrollHeight, 128)}px`;
        }
    }, [value, ref]);
}

export default function ChatWindow({
    conversation,
    viewerRole,
    onSendReply,
    sending,
    onClose,
}: ChatWindowProps) {
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>('' as any);
    useAutoResizeTextarea(inputRef, draft);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation.messages.length]);

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || sending) return;
        const ok = await onSendReply(text);
        if (ok) setDraft('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const peerName = viewerRole === 'buyer' ? conversation.sellerName : conversation.buyerName;
    const isClosed = conversation.status === 'closed';
    const status = STATUS_CONFIG[conversation.status] || STATUS_CONFIG.open;

    const formatMessageContent = (html: string) => {
        const linked = html.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-decoration-underline">$1</a>'
        );
        return { __html: linked };
    };

    // Helper to get Bootstrap badge class
    const getStatusBadgeClass = () => {
        const base = 'badge rounded-pill d-inline-flex align-items-center gap-1';
        switch (status.color) {
            case 'success': return `${base} bg-success bg-opacity-10 text-white`;
            case 'warning': return `${base} bg-warning bg-opacity-10 text-white`;
            case 'info': return `${base} bg-info bg-opacity-10 text-white`;
            case 'primary': return `${base} bg-primary bg-opacity-10 text-white`;
            case 'secondary': return `${base} bg-secondary bg-opacity-10 text-white`;
            default: return `${base} bg-secondary bg-opacity-10 text-white`;
        }
    };

    return (
        <div className="card shadow-lg border-0 rounded-4 overflow-hidden h-100 d-flex flex-column">
            {/* Header */}
            <div className="card-header bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-start">
                <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <h5 className="fw-bold text-dark mb-0 text-truncate">{peerName}</h5>
                        <span className={getStatusBadgeClass()}>
                            <span className="me-1 text-white ">{status.icon}</span>
                            {status.label}
                        </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-secondary small">
                        <span className="text-truncate ">{conversation.listingTitle}</span>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="btn btn-link text-secondary p-1 rounded-circle d-lg-none"
                        aria-label="Close chat"
                    >
                        <svg className="bi" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Messages container */}
            <div className="card-body flex-grow-1 overflow-auto p-4 bg-light" style={{ height: '100vh' }}>
                <div className="d-flex flex-column gap-3">
                    {conversation.messages.length === 0 && (
                        <div className="text-center py-5">
                            <div className="bg-white rounded-circle d-inline-flex p-3 mb-3 shadow-sm">
                                <svg className="bi text-secondary" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                    <path d="M5.255 5.786a.5.5 0 0 0 .278.912c.184.051.367.09.55.117.368.054.737.054 1.104 0 .184-.027.367-.066.55-.117a.5.5 0 0 0 .278-.912.5.5 0 0 0-.278-.912c-.184-.051-.367-.09-.55-.117a3.5 3.5 0 0 0-1.104 0c-.184.027-.367.066-.55.117a.5.5 0 0 0-.278.912zM12 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
                                </svg>
                            </div>
                            <p className="fw-medium text-secondary">No messages yet</p>
                            <p className="small text-secondary-emphasis">Send a message to start the conversation</p>
                        </div>
                    )}

                    {conversation.messages.map((msg, idx) => {
                        const isMine =
                            (viewerRole === 'buyer' && msg.senderRole === 'buyer') ||
                            (viewerRole === 'seller' && msg.senderRole === 'seller');
                        return (
                            <div
                                key={msg._id ?? idx}
                                className={`d-flex flex-column ${isMine ? 'align-items-end' : 'align-items-start'} animate-fade-in-up`}
                            >
                                <div
                                    className={`p-3 rounded-3 shadow-sm ${isMine
                                        ? 'bg-dark text-white rounded-bottom-end-0'
                                        : 'bg-white border text-dark rounded-bottom-start-0'
                                        }`}
                                    style={{ maxWidth: '80%' }}
                                    dangerouslySetInnerHTML={formatMessageContent(msg.content)}
                                />
                                <span className="small text-secondary-emphasis mt-1 px-2">
                                    {formatMessageTime(msg.createdAt)}
                                </span>
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    {(conversation.status === 'open' || conversation.status === 'pending_buyer' || conversation.status === 'pending_seller') && (
                        <div className="d-flex justify-content-start">
                            <div className="bg-white border rounded-3 rounded-bottom-start-0 px-4 py-2 shadow-sm">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="spinner-grow spinner-grow-sm text-secondary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <span className="small text-secondary">
                                        {conversation.status === 'open' ? 'Seller is typing...' : 'Waiting for reply'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Reply input */}
            {!isClosed ? (
                <div className="card-footer bg-white border-top p-3">
                    <div className="d-flex gap-2 bg-light rounded-4 p-1 shadow-inner">
                        <textarea
                            ref={inputRef}
                            className="form-control border-0 bg-transparent shadow-none resize-none"
                            style={{ minHeight: '42px', maxHeight: '128px' }}
                            placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
                            rows={1}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                        />
                    </div>
                    <p className="small text-secondary-emphasis text-center mt-2 mb-0">
                        Press <kbd className="bg-light border text-dark rounded px-1 small">Enter</kbd> to send,{' '}
                        <kbd className="bg-light border text-dark rounded px-1 small">Shift+Enter</kbd> for new line
                    </p>
                </div>
            ) : (
                <div className="card-footer bg-light text-center small text-secondary py-3">
                    <span className="me-1">🔒</span> This conversation has been closed.
                </div>
            )}
        </div>
    );
}