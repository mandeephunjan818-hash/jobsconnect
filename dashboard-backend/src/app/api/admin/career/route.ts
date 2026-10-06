import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import PipelineCrear from '@/modal/Pipelinecrear';
import ExcelJS from 'exceljs';

// ─────────────────────────────────────────────────────────────────────────────
// Admin Authorization Middleware
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }
    // Adjust this check according to your user role implementation
    const user = session.user as any;
    if (!user.isAdmin && user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }
    return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/pipeline
// List profiles with pagination, search, filters, sorting
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        await requireAdmin();
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const stage = searchParams.get('stage');
        const status = searchParams.get('status');
        const isPublic = searchParams.get('isPublic');
        const createdFrom = searchParams.get('createdFrom');
        const createdTo = searchParams.get('createdTo');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '10');

        // Build query
        const query: any = {};

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
            ];
        }

        if (stage) query.stage = stage;
        if (status) query.status = status;
        if (isPublic) query.isPublic = isPublic === 'true';

        if (createdFrom || createdTo) {
            query.createdAt = {};
            if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
            if (createdTo) query.createdAt.$lte = new Date(createdTo + 'T23:59:59.999Z');
        }

        const skip = (page - 1) * perPage;

        const [data, total] = await Promise.all([
            PipelineCrear.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(perPage)
                .lean(),
            PipelineCrear.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (error: any) {
        console.error('[GET /api/admin/pipeline]', error);
        const status = error.message === 'Unauthorized' ? 401 : error.message.includes('Forbidden') ? 403 : 500;
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/pipeline (import from Excel)
// Expects multipart/form-data with a file field named "file"
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        await requireAdmin();
        await connectToDatabase();

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Parse Excel using ExcelJS
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            return NextResponse.json({ error: 'Invalid Excel file' }, { status: 400 });
        }

        // Map Excel headers to schema fields
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.text?.trim().toLowerCase();
        });

        const fieldMap: Record<string, string> = {
            'user id': 'userId',
            'first name': 'firstName',
            'last name': 'lastName',
            'email': 'email',
            'phone': 'phone',
            'location': 'location',
            'country': 'country',
            'linkedin': 'linkedIn',
            'portfolio': 'portfolio',
            'title': 'title',
            'summary': 'summary',
            'stage': 'stage',
            'public': 'isPublic',
            'status': 'status',
        };

        const results = { created: 0, updated: 0, errors: 0 };

        // Process rows
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const item: any = {};

            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (!header) return;
                const field = fieldMap[header];
                if (field) {
                    let value = cell.text;
                    if (field === 'isPublic') {
                        value = value.toLowerCase() === 'yes' ? 'true' : 'false';
                    }
                    item[field] = value;
                }
            });

            // Validate required fields
            if (!item.userId || !item.firstName || !item.lastName || !item.email || !item.title) {
                results.errors++;
                continue;
            }

            try {
                // Upsert based on userId (one profile per user)
                const existing = await PipelineCrear.findOne({ userId: item.userId });
                if (existing) {
                    // Only update allowed fields (skip media)
                    const updates: any = {};
                    const updatableFields = [
                        'firstName', 'lastName', 'email', 'phone', 'location', 'country',
                        'linkedIn', 'portfolio', 'title', 'summary', 'stage', 'isPublic', 'status'
                    ];
                    for (const f of updatableFields) {
                        if (item[f] !== undefined) updates[f] = item[f];
                    }
                    await PipelineCrear.updateOne({ userId: item.userId }, { $set: updates });
                    results.updated++;
                } else {
                    // Create new with defaults for missing fields
                    await PipelineCrear.create({
                        ...item,
                        education: [],
                        experience: [],
                        skills: [],
                        status: item.status || 'draft',
                        stage: item.stage || 'applied',
                        isPublic: item.isPublic ?? false,
                    });
                    results.created++;
                }
            } catch (e) {
                results.errors++;
            }
        }

        return NextResponse.json({ success: true, ...results });
    } catch (error: any) {
        console.error('[POST /api/admin/pipeline]', error);
        const status = error.message === 'Unauthorized' ? 401 : error.message.includes('Forbidden') ? 403 : 500;
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
    }
}