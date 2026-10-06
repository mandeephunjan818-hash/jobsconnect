// src/app/api/conversations/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  — list conversations for the calling user (role-aware)
// POST — buyer starts a new conversation about a listing
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import Conversation from '@/modal/Conversation';
import Listing from '@/modal/Listing';
import BusinessRegistration from '@/modal/BusinessRegistration';
import BuyerRegistration from '@/modal/BuyerRegistration';

// ─── Shared session helper (same pattern as listings/route.ts) ────────────────
export function getSessionUserId(session: any): string | null {
    if (!session?.user) return null;
    return (session.user as any).id || session.user.email || null;
}
export function getSessionUserRole(session: any): string {
    return (session?.user as any)?.role ?? 'user';
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations
// Admin  → all conversations, supports ?status=, ?search=, ?sellerId=, ?buyerId=
// Seller → their conversations (sellerId === userId)
// Buyer  → their conversations (buyerId  === userId)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const session = await getServerSession(authOptions).catch(() => null);
        const userId = getSessionUserId(session);
        const role = getSessionUserRole(session);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sp = req.nextUrl.searchParams;
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '20', 10)));
        const skip = (page - 1) * perPage;

        const filter: Record<string, any> = {};

        if (role === 'admin') {
            // Admin can filter by anything
            if (sp.get('status')) filter.status = sp.get('status');
            if (sp.get('buyerId')) filter.buyerId = sp.get('buyerId');
            if (sp.get('sellerId')) filter.sellerId = sp.get('sellerId');
            if (sp.get('listingId')) filter.listingId = sp.get('listingId');
            if (sp.get('search')) {
                const re = { $regex: sp.get('search'), $options: 'i' };
                filter.$or = [{ buyerName: re }, { sellerName: re }, { subject: re }, { listingTitle: re }];
            }
        } else {
            // Non-admin: scope strictly to own conversations
            // A user may be both buyer on some and seller on others
            const orClauses: any[] = [{ buyerId: userId }, { sellerId: userId }];
            filter.$or = orClauses;

            if (sp.get('status')) filter.status = sp.get('status');
            if (sp.get('listingId')) filter.listingId = sp.get('listingId');
        }
        var select = "buyerId buyerName buyerEmail sellerId sellerName sellerEmail listingId listingTitle listingSlug subject category status unreadByBuyer unreadBySeller unreadByAdmin lastActivityAt createdAt";

        if (role === 'buyer' || role === 'seller') {
            select += "buyerName sellerId sellerName listingId listingTitle listingSlug subject category status unreadByBuyer unreadBySeller lastActivityAt createdAt ";
        }
        const total = await Conversation.countDocuments(filter);
        const conversations = await Conversation.find(filter)
            .select(select)
            .sort({ lastActivityAt: -1 })
            .skip(skip)
            .limit(perPage)
            .select('-messages') // list view — skip heavy messages array
            .lean();

        // Admin unread badge total
        const unreadAgg = role === 'admin'
            ? await Conversation.getTotalUnreadForAdmin()
            : null;
        const totalUnreadAdmin = unreadAgg?.[0]?.total ?? 0;

        return NextResponse.json({
            data: conversations.map(c => ({ ...c, id: (c._id as any).toString() })),
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
            stats: { totalUnreadAdmin },
        });
    } catch (err) {
        console.error('[GET /api/conversations]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/conversations
// Buyer starts a new conversation about a listing.
//
// Security chain:
//   1. Must be authenticated
//   2. Must have an approved BuyerRegistration
//   3. Listing must exist and be active
//   4. One conversation per buyer+listing (unique index enforced at DB level too)
//
// Body: { listingId, message, category? }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const session = await getServerSession(authOptions).catch(() => null);
        const userId = getSessionUserId(session);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
        }

        console.log(`[POST /api/conversations] User ${userId} is starting a conversation`);

        // 1. Buyer must have an approved registration
        const buyerReg = await BuyerRegistration.findOne({ userId }).lean();

        console.log(`[POST /api/conversations] Buyer registration for user ${userId}:`, buyerReg);

        if (!buyerReg || buyerReg.status !== 'approved') {
            return NextResponse.json(
                { error: 'Your buyer profile must be approved before you can contact sellers.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { listingId, message, category } = body;

        if (!listingId || !message?.trim()) {
            return NextResponse.json(
                { error: 'listingId and message are required' },
                { status: 400 }
            );
        }

        // 2. Listing must exist and be active
        const listing = await Listing.findById(listingId).lean();
        if (!listing || !listing.isActive) {
            return NextResponse.json({ error: 'Listing not found or inactive' }, { status: 404 });
        }

        // 3. Resolve seller info from their BusinessRegistration
        const sellerReg = await BusinessRegistration.findOne({ userId: listing.submittedBy }).lean();
        if (!sellerReg) {
            return NextResponse.json({ error: 'Seller information not found' }, { status: 404 });
        }

        // 4. Check for duplicate — one conversation per buyer+listing
        const existing = await Conversation.findOne({ buyerId: userId, listingId: listingId.toString() }).lean();
        if (existing) {
            return NextResponse.json(
                {
                    error: 'You already have an open conversation about this listing.',
                    conversationId: (existing._id as any).toString(),
                },
                { status: 409 }
            );
        }

        // 5. Build names from registrations
        const buyerName = `${buyerReg.firstName} ${buyerReg.lastName}`.trim();
        const buyerEmail = buyerReg.email;
        const sellerName = sellerReg.businessName;
        const sellerEmail = sellerReg.email;

        const firstMessage = {
            content: message.trim(),
            senderRole: 'buyer' as const,
            visibleTo: 'buyer' as const,  // buyer sees own message; admin routes to seller
            isAdminNote: false,
            readByBuyer: true,
            readBySeller: false,
            readByAdmin: false,
            createdAt: new Date(),
        };

        const conversation = await Conversation.create({
            buyerId: userId,
            buyerName,
            buyerEmail,
            sellerId: listing.submittedBy,
            sellerName,
            sellerEmail,
            listingId: listingId.toString(),
            listingTitle: listing.title,
            listingSlug: listing.slug,
            subject: `Enquiry about ${listing.title}`,
            category: category ?? 'general',
            status: 'open',
            messages: [firstMessage],
            unreadByAdmin: 1,
            lastActivityAt: new Date(),
        });

        return NextResponse.json(
            {
                success: true,
                conversationId: conversation._id.toString(),
            },
            { status: 201 }
        );
    } catch (err: any) {
        // Unique index violation (race condition — two requests at once)
        if (err.code === 11000) {
            return NextResponse.json(
                { error: 'A conversation for this listing already exists.' },
                { status: 409 }
            );
        }
        console.error('[POST /api/conversations]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}