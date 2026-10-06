import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ContactInfo, { IContactInfo } from '@/modal/ContactInfo';

export interface ContactInfoItem {
  id: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  emails: string[];
  socialLinks: Array<{
    platform: string;
    url: string;
    iconClass: string;
  }>;
}

export interface ContactInfoApiResponse {
  data: ContactInfoItem | null;
}

export interface ContactInfoApiError {
  error: string;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // We assume there is only one contact info document. Fetch the first one.
    const contactInfoDoc = await ContactInfo.findOne({}).lean();

    if (!contactInfoDoc) {
      // Return 404 if not found, but you might want to return default data or error.
      return NextResponse.json(
        { error: 'Contact info not found' } satisfies ContactInfoApiError,
        { status: 404 }
      );
    }

    const data: ContactInfoItem = {
      id: contactInfoDoc._id.toString(),
      phone: contactInfoDoc.phone,
      addressLine1: contactInfoDoc.addressLine1,
      addressLine2: contactInfoDoc.addressLine2,
      emails: contactInfoDoc.emails,
      socialLinks: contactInfoDoc.socialLinks,
    };

    return NextResponse.json(
      { data } satisfies ContactInfoApiResponse,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('[GET /apis/contact-info]', err);
    return NextResponse.json(
      { error: 'Internal server error' } satisfies ContactInfoApiError,
      { status: 500 }
    );
  }
}