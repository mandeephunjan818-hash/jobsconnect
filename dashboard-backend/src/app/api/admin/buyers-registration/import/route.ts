import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BuyerRegistration from '@/modal/BuyerRegistration';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items to import' }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const item of items) {
      try {
        // Basic validation
        if (!item.email) {
          errors++;
          continue;
        }

        // Check if exists by email (or you could use userId if provided)
        const existing = await BuyerRegistration.findOne({ email: item.email });
        if (existing) {
          // Update existing
          await BuyerRegistration.updateOne(
            { _id: existing._id },
            {
              $set: {
                firstName: item.firstName || existing.firstName,
                lastName: item.lastName || existing.lastName,
                phone: item.phone || existing.phone,
                country: item.country || existing.country,
                userId: item.userId || existing.userId,
                status: item.status && ['new', 'reviewed', 'rejected'].includes(item.status) ? item.status : existing.status,
              },
            }
          );
          revalidatePath(`/admin/buyers/${existing._id}/agreements`); // Revalidate the buyer detail page
          updated++;
        } else {
          // Create new
          const result = await BuyerRegistration.create({
            firstName: item.firstName || '',
            lastName: item.lastName || '',
            email: item.email,
            phone: item.phone || '',
            country: item.country || '',
            userId: item.userId || `import_${Date.now()}_${Math.random()}`,
            status: item.status && ['new', 'reviewed', 'rejected'].includes(item.status) ? item.status : 'new',
            adminNotes: [{
              message: 'Imported via Excel',
              type: 'general',
              createdAt: new Date(),
              createdBy: session.user?.email,
            }],
          });

          revalidatePath(`/admin/buyers/${result._id}/agreements`); // Revalidate the buyer detail page

          inserted++;
        }
      } catch (err) {
        console.error('Import row error:', err);
        errors++;
      }
    }

    return NextResponse.json({ inserted, updated, errors });
  } catch (error) {
    console.error('[POST /api/admin/buyer-registration/import]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}