import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogComment from '@/modal/BlogComment';

// GET /api/admin/blog-comments
// Full list with filters: slug, isApproved, search, page, perPage, sortBy, sortOrder
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const slug = sp.get('slug');
        const search = sp.get('search') ?? '';
        const isApproved = sp.get('isApproved');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(100, parseInt(sp.get('perPage') ?? '10', 10)));
        const sortBy = sp.get('sortBy') ?? 'createdAt';
        const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

        const query: any = {};

        if (slug) query.blogSlug = slug;

        if (isApproved !== null && isApproved !== '') {
            query.isApproved = isApproved === 'true';
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
                { blogSlug: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * perPage;

        const [docs, total] = await Promise.all([
            BlogComment.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(perPage)
                .lean(),
            BlogComment.countDocuments(query),
        ]);

        const data = docs.map((doc: any) => ({
            id: doc._id.toString(),
            blogSlug: doc.blogSlug,
            name: doc.name,
            email: doc.email,
            phone: doc.phone,
            message: doc.message,
            isApproved: doc.isApproved,
            parentId: doc.parentId?.toString() ?? null,
            createdAt: doc.createdAt?.toISOString(),
            updatedAt: doc.updatedAt?.toISOString(),
        }));

        return NextResponse.json({
            data,
            total,
            page,
            perPage,
            totalPages: Math.max(1, Math.ceil(total / perPage)),
        });
    } catch (err) {
        console.error('[GET /api/admin/blog-comments]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}