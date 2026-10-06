import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import About from '@/modal/About';
import { uploadImage } from '@/lib/cloudinary';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const about = await About.findById(id).lean();
        if (!about) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json(about);
    } catch (err) {
        console.error('[GET /apis/about/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const about = await About.findById(id);
        if (!about) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const formData = await req.formData();

        // Handle image file if present
        const imageFile = formData.get('imageFile') as File | null;
        if (imageFile) {
            // Upload to Cloudinary in folder 'about'
            const imageUrl = await uploadImage(imageFile, 'about');
            about.imageUrl = imageUrl;
        } else {
            // If no file, use the imageUrl from form data (existing URL or new URL input)
            const imageUrl = formData.get('imageUrl') as string;
            if (imageUrl) about.imageUrl = imageUrl;
        }

        // Update other fields
        about.pageIdentifier = formData.get('pageIdentifier') as string;
        about.subtitle = formData.get('subtitle') as string;
        about.title = formData.get('title') as string;
        about.buttonText = formData.get('buttonText') as string;
        about.buttonLink = formData.get('buttonLink') as string;

        // Arrays: paragraphs, listItems – they come as multiple entries with same key
        about.paragraphs = formData.getAll('paragraphs') as string[];
        about.listItems = formData.getAll('listItems') as string[];

        await about.save();

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us'] }),
        });

        return NextResponse.json({ message: 'Updated successfully', data: about });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const about = await About.findByIdAndDelete(id);
        if (!about) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us'] }),
        });
        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('[DELETE /apis/about/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}