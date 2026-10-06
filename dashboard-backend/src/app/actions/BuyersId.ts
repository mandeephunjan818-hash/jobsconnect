// src/lib/getBusinessData.ts
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';

export async function getBusinessRegistrationsForBuild() {
  try {
    await connectToDatabase();
    
    // We fetch the data
    const data = await BusinessRegistration.find({}, '_id').lean();

    // If data is null or undefined, return an empty array
    return { data: data || [] };
  } catch (error) {
    // If the DB connection fails, log it but return an empty array
    // This prevents the whole "npm run build" from crashing
    console.error('Database error during generateStaticParams:', error);
    return { data: [] };
  }
}
