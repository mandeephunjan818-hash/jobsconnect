import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import AboutStory from '@/modal/AboutStory';
import { uploadImage } from '@/lib/cloudinary';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const story = await AboutStory.findById(id);
        if (!story) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const formData = await req.formData();

        // Main image
        const mainImageFile = formData.get('mainImageFile') as File | null;
        if (mainImageFile) {
            story.mainImage = await uploadImage(mainImageFile, 'story/main');
        } else {
            const mainImage = formData.get('mainImage') as string;
            if (mainImage) story.mainImage = mainImage;
        }

        // Side images: loop through indices (max 10)
        const sideImages: string[] = [];
        for (let i = 0; i < 10; i++) {
            const file = formData.get(`sideImageFile_${i}`) as File | null;
            if (file) {
                sideImages.push(await uploadImage(file, 'story/side'));
            } else {
                const url = formData.get(`sideImage_${i}`) as string;
                if (url) sideImages.push(url);
            }
        }
        story.sideImages = sideImages.filter(Boolean); // remove empty entries

        // Simple fields
        story.pageIdentifier = formData.get('pageIdentifier') as string;
        story.heading = formData.get('heading') as string;
        story.description = formData.get('description') as string;
        story.buttonText = formData.get('buttonText') as string;
        story.buttonLink = formData.get('buttonLink') as string;

        // List items – multiple entries
        story.listItems = formData.getAll('listItems') as string[];

        // Stats – sent as JSON strings (one per stat)
        const stats = formData.getAll('stats'); // array of JSON strings
        story.stats = stats.map((statStr) => JSON.parse(statStr as string));

        await story.save();

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/about-us'] }),
        });

        return NextResponse.json({ message: 'Updated successfully', data: story });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}