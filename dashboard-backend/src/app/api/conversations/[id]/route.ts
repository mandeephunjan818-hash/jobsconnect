// src/app/api/conversations/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET    — fetch conversation detail, messages filtered per viewer's role
// PUT    — send a message (3 actions: admin_send, user_reply, set_status)
// DELETE — admin only
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import Conversation, { IMessage } from '@/modal/Conversation';
import { getSessionUserId, getSessionUserRole } from '../route';

// ─── Message filter: strips messages the caller shouldn't see ─────────────────
function filterMessages(messages: IMessage[], role: 'buyer' | 'seller' | 'admin') {
  return messages
    .filter(m => {
      if (role === 'admin') return true;
      if (role === 'buyer')  return m.visibleTo === 'buyer'  || m.visibleTo === 'both';
      if (role === 'seller') return m.visibleTo === 'seller' || m.visibleTo === 'both';
      return false;
    })
    .map(m => {
      if (role !== 'admin') {
        // Strip internal read-tracking fields from user-facing responses
        const { isAdminNote, readByBuyer, readBySeller, readByAdmin, ...safe } = m as any;
        return safe;
      }
      return m;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = getSessionUserId(session);
    const rawRole = getSessionUserRole(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conv = await Conversation.findById(id).lean();

    if (!conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // ── Access control ───────────────────────────────────────
    const isBuyer  = conv.buyerId  === userId;
    const isSeller = conv.sellerId === userId;
    const isAdmin  = rawRole === 'admin';

    if (!isAdmin && !isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine the effective role for this user on this conversation
    const role: 'buyer' | 'seller' | 'admin' =
      isAdmin   ? 'admin' :
      isBuyer   ? 'buyer' :
                  'seller';

    // ── Mark messages as read & reset unread counter ─────────
    const readUpdate: Record<string, any> = {};
    if (role === 'buyer') {
      readUpdate['$set']  = { 'messages.$[].readByBuyer': true };
      readUpdate['$set']['unreadByBuyer'] = 0;
    } else if (role === 'seller') {
      readUpdate['$set']  = { 'messages.$[].readBySeller': true };
      readUpdate['$set']['unreadBySeller'] = 0;
    } else {
      readUpdate['$set']  = { 'messages.$[].readByAdmin': true };
      readUpdate['$set']['unreadByAdmin'] = 0;
    }

    await Conversation.findByIdAndUpdate(id, readUpdate);

    const filteredMessages = filterMessages(conv.messages as IMessage[], role);

    return NextResponse.json({
      id:           (conv._id as any).toString(),
      buyerId:      rawRole === 'buyer' ? conv.buyerId : rawRole === 'seller' ? undefined : conv.buyerId,
      buyerName:    conv.buyerName,
      buyerEmail:   rawRole === 'buyer' ? conv.buyerEmail : rawRole === 'seller' ? undefined : conv.buyerEmail,
      sellerId:     conv.sellerId,
      sellerName:   conv.sellerName,
      sellerEmail:  rawRole === 'seller' ? conv.sellerEmail : rawRole === 'buyer' ? undefined : conv.sellerEmail,
      listingId:    conv.listingId,
      listingTitle: conv.listingTitle,
      listingSlug:  conv.listingSlug,
      subject:      conv.subject,
      category:     conv.category,
      status:       conv.status,
      messages:     filteredMessages,
      unreadByBuyer:  conv.unreadByBuyer,
      unreadBySeller: conv.unreadBySeller,
      unreadByAdmin:  conv.unreadByAdmin,
      lastActivityAt: conv.lastActivityAt,
      createdAt:      conv.createdAt,
      // Expose which role this user has (useful for UI rendering)
      viewerRole: role,
    });
  } catch (err) {
    console.error('[GET /api/conversations/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/conversations/[id]
//
// action: 'admin_send'  — admin routes a message to buyer or seller
// action: 'user_reply'  — buyer or seller sends a reply (goes to admin queue)
// action: 'set_status'  — admin updates conversation status
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions).catch(() => null);
    const userId  = getSessionUserId(session);
    const rawRole = getSessionUserRole(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const conv = await Conversation.findById(id);

    if (!conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isBuyer  = conv.buyerId  === userId;
    const isSeller = conv.sellerId === userId;
    const isAdmin  = rawRole === 'admin';

    if (!isAdmin && !isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── action: admin_send ────────────────────────────────────
    if (body.action === 'admin_send') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

      const { content, recipient, isNote = false } = body;
      if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });
      if (!isNote && !['buyer', 'seller'].includes(recipient)) {
        return NextResponse.json({ error: 'recipient must be "buyer" or "seller"' }, { status: 400 });
      }

      conv.messages.push({
        content:      content.trim(),
        senderRole:   'admin',
        visibleTo:    isNote ? 'admin' : (recipient as 'buyer' | 'seller'),
        isAdminNote:  isNote,
        readByBuyer:  isNote || recipient !== 'buyer',
        readBySeller: isNote || recipient !== 'seller',
        readByAdmin:  true,
        createdAt:    new Date(),
      } as IMessage);

      if (!isNote) {
        if (recipient === 'buyer')  { conv.unreadByBuyer  += 1; conv.status = 'pending_buyer';  }
        if (recipient === 'seller') { conv.unreadBySeller += 1; conv.status = 'pending_seller'; }
      }
      conv.lastActivityAt = new Date();
      conv.updatedAt      = new Date();
      await conv.save();

      return NextResponse.json({ success: true });
    }

    // ── action: user_reply ────────────────────────────────────
    if (body.action === 'user_reply') {
      if (isAdmin) return NextResponse.json({ error: 'Admins use admin_send' }, { status: 400 });
      if (conv.status === 'closed') {
        return NextResponse.json({ error: 'Conversation is closed' }, { status: 400 });
      }

      const { content } = body;
      if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

      const role = isBuyer ? 'buyer' : 'seller';

      conv.messages.push({
        content:      content.trim(),
        senderRole:   role,
        visibleTo:    role,         // only admin + same party can see raw reply
        isAdminNote:  false,
        readByBuyer:  isBuyer,
        readBySeller: isSeller,
        readByAdmin:  false,        // admin has not read it yet
        createdAt:    new Date(),
      } as IMessage);

      conv.unreadByAdmin += 1;
      conv.status         = 'open';
      conv.lastActivityAt = new Date();
      conv.updatedAt      = new Date();
      await conv.save();

      return NextResponse.json({ success: true });
    }

    // ── action: set_status ────────────────────────────────────
    if (body.action === 'set_status') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      conv.status    = body.status;
      conv.updatedAt = new Date();
      await conv.save();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[PUT /api/conversations/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/conversations/[id] — admin only
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions).catch(() => null);
    const userId  = getSessionUserId(session);
    const role    = getSessionUserRole(session);

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await Conversation.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/conversations/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}