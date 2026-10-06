import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import AboutStory from '@/modal/AboutStory';

export interface AboutStoryItem {
    id: string;
    pageIdentifier: string;
    heading: string;
    description: string;
    listItems: string[];
    buttonText: string;
    buttonLink: string;
    mainImage: string;
    sideImages: string[];
    stats: Array<{
        number: number;
        suffix: string;
        text: string;
    }>;
}

export interface AboutStoryApiResponse {
    data: AboutStoryItem | null;
}

export interface AboutStoryApiError {
    error: string;
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sp = req.nextUrl.searchParams;
        const page = sp.get('page') || 'home-one'; // default page identifier

        const story = await AboutStory.findOne({ pageIdentifier: page }).lean();

        if (!story) {
            return NextResponse.json(
                { error: 'About story not found' } satisfies AboutStoryApiError,
                { status: 404 }
            );
        }

        const data: AboutStoryItem = {
            id: story._id.toString(),
            pageIdentifier: story.pageIdentifier,
            heading: story.heading,
            description: story.description,
            listItems: story.listItems,
            buttonText: story.buttonText,
            buttonLink: story.buttonLink,
            mainImage: story.mainImage,
            sideImages: story.sideImages,
            stats: story.stats.map((stat: any) => ({
                number: stat.number,
                suffix: stat.suffix || '+',
                text: stat.text,
            })),
        };

        return NextResponse.json(
            { data } satisfies AboutStoryApiResponse,
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            }
        );
    } catch (err) {
        console.error('[GET /apis/about-story]', err);
        return NextResponse.json(
            { error: 'Internal server error' } satisfies AboutStoryApiError,
            { status: 500 }
        );
    }
}