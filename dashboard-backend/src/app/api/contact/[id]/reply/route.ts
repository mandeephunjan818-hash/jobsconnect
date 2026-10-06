import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ContactMessage from '@/modal/ContactMessage';
import { sendContactReplyEmail } from '@/utils/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { message } = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Reply message is required' }, { status: 400 });
    }

    const contactMessage = await ContactMessage.findById(id);
    if (!contactMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    contactMessage.replies.push({
      message,
      createdAt: new Date(),
    });
    contactMessage.status = 'replied';
    await contactMessage.save();

    sendContactReplyEmail(
      contactMessage.email,
      contactMessage.name,
      message
    ).catch((emailError) => {
      console.error('Failed to send reply email:', emailError);
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /apis/admin/contact-messages/:id/reply]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}