'use client';
// app/(dashboard)/conversations/page.tsx
// Bootstrap 5 version – conversation list and chat window for buyers/sellers.

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useConversations, ConversationSummary } from '@/hooks/useConversations';
import ChatWindow from '@/components/shared/ChatWindow';

// Status dot colors (Bootstrap background classes)
const STATUS_DOT_CLASS: Record<string, string> = {
  open:            'bg-success',
  pending_buyer:   'bg-warning',
  pending_seller:  'bg-info',
  resolved:        'bg-primary',
  closed:          'bg-secondary',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── Thread card (Bootstrap styled) ──────────────────────────────────────────
function ThreadCard({
  conv,
  isActive,
  viewerUserId,
  onClick,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  viewerUserId: string;
  onClick: () => void;
}) {
  const isBuyerPerspective = conv.buyerId === viewerUserId;
  const peerName    = isBuyerPerspective ? conv.sellerName : conv.buyerName;
  const unreadCount = isBuyerPerspective ? conv.unreadByBuyer : conv.unreadBySeller;
  const initials    = peerName.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`w-100 text-start border-bottom p-3 d-flex align-items-start gap-3 transition-hover ${isActive ? 'bg-light  ' : ''}`}
      style={{ borderColor: '#f1f5f9', background: isActive ? '#f8f9fa' : 'transparent' }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ''; }}
    >
      {/* Avatar with status dot */}
      <div className="position-relative flex-shrink-0 mt-1">
        <div className="rounded-circle bg-secondary bg-opacity-25 text-secondary d-flex align-items-center justify-content-center"
             style={{ width: '40px', height: '40px', fontSize: '12px', fontWeight: 600 }}>
          {initials}
        </div>
        <span className={`position-absolute bottom-0 end-0 rounded-circle border border-white ${STATUS_DOT_CLASS[conv.status] ?? 'bg-secondary'}`}
              style={{ width: '10px', height: '10px' }} />
      </div>

      {/* Text content */}
      <div className="flex-grow-1 min-w-0">
        <div className="d-flex justify-content-between align-items-baseline gap-1 mb-1">
          <span className={`text-truncate ${unreadCount > 0 ? 'fw-semibold text-dark' : 'fw-medium text-secondary'}`}
                style={{ fontSize: '0.875rem' }}>
            {peerName}
          </span>
          <span className="flex-shrink-0 text-muted" style={{ fontSize: '10px' }}>{timeAgo(conv.lastActivityAt)}</span>
        </div>
        <p className="small text-muted text-truncate mb-0">{conv.listingTitle}</p>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="flex-shrink-0 mt-1 bg-dark text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold"
              style={{ minWidth: '18px', height: '18px', fontSize: '10px', padding: '0 4px' }}>
          {unreadCount}
        </span>
      )}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ConversationsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || session?.user?.email || '';

  const {
    list,
    active,
    loadingList,
    loadingDetail,
    sending,
    error,
    openConversation,
    sendReply,
    closeActive,
  } = useConversations();

  const [search, setSearch]   = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleOpen = async (conv: ConversationSummary) => {
    await openConversation(conv.id);
    setMobileShowChat(true);
  };

  const handleClose = () => {
    closeActive();
    setMobileShowChat(false);
  };

  const filtered = list.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.listingTitle.toLowerCase().includes(q) ||
      c.buyerName.toLowerCase().includes(q) ||
      c.sellerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="d-flex h-100 overflow-hidden bg-white mt-3 " style={{ height: 'calc(100vh - 64px)' }}>
      {/* LEFT: Conversation list (hidden on mobile when chat open) */}
      <aside
        className={` flex-shrink-0 d-flex flex-column pe-3 ${
          mobileShowChat ? 'd-none d-lg-flex w-50 ' : 'd-flex w-100 w-lg-25'
        }`}
        style={{ borderColor: '#e2e8f0' }}
      >
        {/* Search bar */}
        <div className={`p-3 border-bottom`} style={{ borderColor: '#f1f5f9' }}>
          <div className="position-relative">
            <svg className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="form-control ps-9 py-2 rounded-3 bg-light border-0"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {/* List container */}
        <div className="flex-grow-1 overflow-auto">
          {loadingList ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-secondary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center small text-muted py-5 px-4">
              {search ? 'No conversations match your search.' : 'No conversations yet.'}
            </div>
          ) : (
            filtered.map(conv => (
              <ThreadCard
                key={conv.id}
                conv={conv}
                isActive={active?.id === conv.id}
                viewerUserId={userId}
                onClick={() => handleOpen(conv)}
              />
            ))
          )}
        </div>
      </aside>

      {/* RIGHT: Chat window (visible on desktop always, on mobile only when chat open) */}
      <main
        className={`flex-grow-1 d-flex flex-column min-w-0 ${
          mobileShowChat ? 'd-flex' : 'd-none d-lg-flex'
        }`}
         style={{ maxHeight: '86vh' }}
      >
        {loadingDetail ? (
          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading conversation...</span>
            </div>
          </div>
        ) : active ? (
          <ChatWindow
            conversation={active}
            viewerRole={active.viewerRole as 'admin' | 'buyer' | 'seller'}
            onSendReply={sendReply}
            sending={sending}
            onClose={handleClose}
          />
        ) : (
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted gap-3">
            <svg className="text-secondary opacity-25" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="small mb-0">Select a conversation to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
}