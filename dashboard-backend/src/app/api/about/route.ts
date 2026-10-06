import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import About, { IAbout } from '@/modal/About';

export interface AboutItem {
  id: string;
  pageIdentifier: string;
  imageUrl: string;
  subtitle: string;
  title: string;
  paragraphs: string[];
  listItems: string[];
  buttonText: string;
  buttonLink: string;
}

export interface AboutApiResponse {
  data: AboutItem | null;
}

export interface AboutApiError {
  error: string;
}

// ─── GET /apis/about?page=home-two ─────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const page = sp.get('page') || 'home-two'; // default page identifier

    const aboutDoc = await About.findOne({ pageIdentifier: page }).lean();

    if (!aboutDoc) {
      return NextResponse.json(
        { error: 'About section not found' } satisfies AboutApiError,
        { status: 404 }
      );
    }

    const data: AboutItem = {
      id: aboutDoc._id.toString(),
      pageIdentifier: aboutDoc.pageIdentifier,
      imageUrl: aboutDoc.imageUrl,
      subtitle: aboutDoc.subtitle,
      title: aboutDoc.title,
      paragraphs: aboutDoc.paragraphs,
      listItems: aboutDoc.listItems,
      buttonText: aboutDoc.buttonText,
      buttonLink: aboutDoc.buttonLink,
    };

    return NextResponse.json(
      { data } satisfies AboutApiResponse,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('[GET /apis/about]', err);
    return NextResponse.json(
      { error: 'Internal server error' } satisfies AboutApiError,
      { status: 500 }
    );
  }
}