import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ContactMessage from '@/modal/ContactMessage';

// apis/admin/contact-messages/[id]/route.ts  — GET handler only, rest unchanged

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const message = await ContactMessage.findById(id).lean();
        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        if (message.status === 'unread') {
            await ContactMessage.findByIdAndUpdate(id, { status: 'read' });
            message.status = 'read';
        }

        const data = {
            id: message._id.toString(),
            name: message.name,
            email: message.email,
            subject: message.subject,
            message: message.message,
            status: message.status,
            site: message.site,          // ← new
            createdAt: message.createdAt.toISOString(),
            replies: message.replies?.map((r: any) => ({
                id: r._id.toString(),
                message: r.message,
                createdAt: r.createdAt.toISOString(),
            })) || [],
        };

        return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
        console.error('[GET /apis/admin/contact-messages/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        await ContactMessage.findByIdAndUpdate(id, { status: 'read' });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error('[PATCH /apis/admin/contact-messages/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}