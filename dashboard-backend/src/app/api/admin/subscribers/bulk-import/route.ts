// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin/subscribers/bulk-import/route.ts  (Admin)
// POST /api/admin/subscribers/bulk-import
// Accepts JSON array: [{ email, name?, preferences? }]
// Skips duplicates, returns counts of inserted / skipped / failed
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongooes';
import Subscriber from '@/modal/Subscriber';
import { KNOWN_SITES, SiteId } from '@/lib/sites';

interface BulkEntry {
    email: string;
    name?: string;
    siteId: SiteId;
    preferences?: { blogs?: boolean; jobs?: boolean };
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const body = await req.json();

        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json({ error: 'Body must be a non-empty array' }, { status: 400 });
        }

        if (body.length > 5000) {
            return NextResponse.json({ error: 'Maximum 5000 entries per import' }, { status: 400 });
        }


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let inserted = 0;
        let skipped = 0;
        const failed: Array<{ email: string; reason: string }> = [];

        // Collect valid entries first
        const validEntries: BulkEntry[] = [];
        for (const entry of body) {
            if (!entry.email || typeof entry.email !== 'string') {
                failed.push({ email: entry.email ?? '(missing)', reason: 'Email is required' });
                continue;
            }
            const email = entry.email.toLowerCase().trim();
            if (!emailRegex.test(email)) {
                failed.push({ email, reason: 'Invalid email format' });
                continue;
            }

            if (!entry.siteId || !(KNOWN_SITES as readonly string[]).includes(entry.siteId)) {
                failed.push({ email: entry.email, reason: 'Invalid or missing siteId' });
                continue;
            }

            validEntries.push({ ...entry, email });
        }

        // Fetch already-existing emails in one query
        const emails = validEntries.map((e) => e.email);
        const existing = await Subscriber.find({ email: { $in: emails } })
            .select('email siteId')
            .lean();
        const existingSet = new Set(existing.map((e: any) => `${e.email}::${e.siteId}`));

        const toInsert: any[] = [];
        for (const entry of validEntries) {
            if (existingSet.has(`${entry.email}::${entry.siteId}`)) {
                skipped++;
                continue;
            }
            toInsert.push({
                email: entry.email,
                name: entry.name,
                siteId: entry.siteId,
                status: 'active',
                preferences: {
                    blogs: entry.preferences?.blogs ?? true,
                    jobs: entry.preferences?.jobs ?? true,
                },
                unsubscribeToken: crypto.randomBytes(32).toString('hex'),
                subscribedAt: new Date(),
            });
        }

        if (toInsert.length > 0) {
            const result = await Subscriber.insertMany(toInsert, { ordered: false });
            inserted = result.length;
        }

        return NextResponse.json(
            {
                success: true,
                inserted,
                skipped,
                failed: failed.length,
                failedEntries: failed,
            },
            { status: 201 }
        );
    } catch (err: any) {
        // Handle partial insertMany failures (duplicate key mid-batch)
        if (err.code === 11000 && err.insertedDocs) {
            return NextResponse.json(
                { success: true, inserted: err.insertedDocs.length, skipped: 0, failed: 0, failedEntries: [] },
                { status: 201 }
            );
        }
        console.error('[POST /api/admin/subscribers/bulk-import]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}