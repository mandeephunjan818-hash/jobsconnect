import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';
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
        // Basic validation - email is required for lookup
        if (!item.email) {
          errors++;
          continue;
        }

        // Check if business registration exists by email or userId
        const existing = await BusinessRegistration.findOne({ 
          $or: [
            { email: item.email },
            ...(item.userId ? [{ userId: item.userId }] : [])
          ]
        });

        if (existing) {
          // Update existing
          await BusinessRegistration.updateOne(
            { _id: existing._id },
            {
              $set: {
                businessName: item.businessName || existing.businessName,
                businessType: item.businessType || existing.businessType,
                location: item.location || existing.location,
                years: item.years || existing.years,
                contactNumber: item.contactNumber || existing.contactNumber,
                revenue: item.revenue || existing.revenue,
                ebitda: item.ebitda || existing.ebitda,
                overview: item.overview || existing.overview,
                firstName: item.firstName || existing.firstName,
                lastName: item.lastName || existing.lastName,
                sellerContactNumber: item.sellerContactNumber || existing.sellerContactNumber,
                ownerOrBroker: item.ownerOrBroker || existing.ownerOrBroker,
                country: item.country || existing.country,
                status: item.status && ['draft', 'pending', 'approved', 'rejected'].includes(item.status) 
                  ? item.status 
                  : existing.status,
              },
            }
          );
          revalidatePath(`/admin/business-registrations/${existing._id}/agreements`);
          updated++;
        } else {
          // Create new business registration
          const result = await BusinessRegistration.create({
            userId: item.userId || `import_${Date.now()}_${Math.random()}`,
            businessName: item.businessName || '',
            businessType: item.businessType || '',
            location: item.location || '',
            years: item.years || 0,
            contactNumber: item.contactNumber || '',
            revenue: item.revenue || '',
            ebitda: item.ebitda || '',
            overview: item.overview || '',
            firstName: item.firstName || '',
            lastName: item.lastName || '',
            email: item.email,
            sellerContactNumber: item.sellerContactNumber || '',
            ownerOrBroker: item.ownerOrBroker || '',
            confirmed: item.confirmed ?? false,
            selfieUrl: item.selfieUrl || '',
            country: item.country || '',
            status: item.status && ['draft', 'pending', 'approved', 'rejected'].includes(item.status) 
              ? item.status 
              : 'draft',
            adminNotes: [{
              message: 'Imported via Excel',
              type: 'general',
              createdAt: new Date(),
              createdBy: session.user?.email,
            }],
          });

          revalidatePath(`/admin/business-registrations/${result._id}/agreements`);
          inserted++;
        }
      } catch (err) {
        console.error('Import row error:', err);
        errors++;
      }
    }

    return NextResponse.json({ inserted, updated, errors });
  } catch (error) {
    console.error('[POST /api/admin/business-registrations/import]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}