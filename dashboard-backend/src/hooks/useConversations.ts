// hooks/useConversations.ts
// Shared data hook for both buyer and seller chat pages.
// Handles list fetching, single conversation loading, sending replies, and polling.
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ConversationSummary {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  subject: string;
  category: string;
  status: string;
  unreadByBuyer: number;
  unreadBySeller: number;
  unreadByAdmin: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ConversationMessage {
  _id?: string;
  content: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  visibleTo: string;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
  viewerRole: 'buyer' | 'seller' | 'admin';
  orderId?: string;
}

interface UseConversationsOptions {
  listingId?: string; // if provided, filter list to this listing
}

export function useConversations(opts: UseConversationsOptions = {}) {
  const [list, setList]           = useState<ConversationSummary[]>([]);
  const [active, setActive]       = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    const q = new URLSearchParams();
    if (opts.listingId) q.set('listingId', opts.listingId);
    const res = await fetch(`/api/conversations?${q}`);
    if (res.ok) {
      const data = await res.json();
      setList(data.data ?? []);
    }
    setLoadingList(false);
  }, [opts.listingId]);

  useEffect(() => {
    fetchList();
    const t = setInterval(fetchList, 30000);
    return () => clearInterval(t);
  }, [fetchList]);

  // ── Fetch single conversation ─────────────────────────────────────────────
  const openConversation = useCallback(async (id: string) => {
    setLoadingDetail(true);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      console.log('Loaded conversation detail:', data); 
      setActive(data);
    }
    setLoadingDetail(false);
    fetchList(); // refresh unread counters
  }, [fetchList]);

  // ── Poll active conversation ──────────────────────────────────────────────
  useEffect(() => {
    if (!active?.id) {
      clearInterval(pollingRef.current!);
      return;
    }
    pollingRef.current = setInterval(async () => {
      const res = await fetch(`/api/conversations/${active.id}`);
      if (res.ok) {
        const data = await res.json();
        setActive(data);
      }
    }, 4000);
    return () => clearInterval(pollingRef.current!);
  }, [active?.id]);

  // ── Send reply ────────────────────────────────────────────────────────────
  const sendReply = useCallback(async (content: string): Promise<boolean> => {
    if (!active || !content.trim()) return false;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/conversations/${active.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'user_reply', content }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to send');
        return false;
      }
      // Refresh detail
      const updated = await fetch(`/api/conversations/${active.id}`);
      if (updated.ok) setActive(await updated.json());
      fetchList();
      return true;
    } finally {
      setSending(false);
    }
  }, [active, fetchList]);

  // ── Start a new conversation (buyer only) ─────────────────────────────────
  const startConversation = useCallback(async (
    listingId: string,
    message: string,
    category = 'general'
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, message, category }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchList();
        return { success: true, conversationId: data.conversationId };
      }
      return { success: false, error: data.error ?? 'Failed to start conversation' };
    } finally {
      setSending(false);
    }
  }, [fetchList]);

  const closeActive = () => {
    clearInterval(pollingRef.current!);
    setActive(null);
  };

  return {
    list,
    active,
    loadingList,
    loadingDetail,
    sending,
    error,
    setError,
    fetchList,
    openConversation,
    sendReply,
    startConversation,
    closeActive,
  };
}