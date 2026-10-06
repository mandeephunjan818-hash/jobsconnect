// src/lib/getBusinessAgreements.ts
import connectToDatabase from '@/lib/mongooes';
import BusinessRegistration from '@/modal/BusinessRegistration';
import Agreement from '@/modal/Agreement';

export async function getAllBusinessAgreementsForBuild() {
  try {
    await connectToDatabase();

    // 1. Get all Business IDs safely
    const businesses = await BusinessRegistration.find({}, '_id').lean();
    
    if (!businesses || !Array.isArray(businesses)) {
      return [];
    }

    const results: { id: string }[] = [];

    // 2. Loop through businesses and find their agreements directly
    for (const business of businesses) {
      // Skip if the business document is missing an _id
      if (!business?._id) continue;

      try {
        const agreements = await Agreement.find({ 
          BusinessRegistrationId: business._id.toString() 
        }).lean();

        if (agreements && Array.isArray(agreements)) {
          const validPaths = agreements
            .filter((item: any) => item?.acceptanceToken) // Safety: ensure token exists
            .map((item: any) => ({
              id: item.acceptanceToken.toString(),
            }));
          
          results.push(...validPaths);
        }
      } catch (innerError) {
        // Log individual business failures so you can fix the data later
        console.error(`Error fetching agreements for business ${business._id}:`, innerError);
        continue; // Keep the build moving for other businesses
      }
    }

    return results;
  } catch (error) {
    // Catch fatal errors (like DB connection) to prevent 'npm run build' from crashing
    console.error('Fatal error in getAllBusinessAgreementsForBuild:', error);
    return [];
  }
}
