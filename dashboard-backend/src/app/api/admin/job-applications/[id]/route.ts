import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import JobApplication from '@/modal/JobApplication';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;   // ✅ await the promise

        await connectToDatabase();
        const body = await req.json();
        const update: any = {};
        if (body.status) update.status = body.status;

        const updated = await JobApplication.findByIdAndUpdate(id, update, {
            new: true,
        });
        if (!updated) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (err) {
        console.error('[PATCH job-application]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;   // ✅ await the promise

        if (!id) {
            return NextResponse.json({ error: 'Missing application ID' }, { status: 400 });
        }

        await connectToDatabase();
        const deleted = await JobApplication.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[DELETE job-application]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}