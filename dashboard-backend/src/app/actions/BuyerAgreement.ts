// src/lib/getAgreements.ts
import connectToDatabase from '@/lib/mongooes';
import BuyerRegistration from '@/modal/BuyerRegistration';
import Agreement from '@/modal/Agreement';

export async function getAllAgreementsForBuild() {
  try {
    await connectToDatabase();

    // 1. Get all Buyer IDs safely
    const buyers = await BuyerRegistration.find({}, '_id').lean();
    
    if (!buyers || !Array.isArray(buyers)) {
      return [];
    }

    const results: { id: string }[] = [];

    // 2. Loop through buyers and find their agreements directly
    for (const buyer of buyers) {
      // Skip if the buyer document is missing an _id
      if (!buyer?._id) continue;

      try {
        const agreements = await Agreement.find({ 
          BusinessRegistrationId: buyer._id.toString() 
        }).lean();

        if (agreements && Array.isArray(agreements)) {
          const validPaths = agreements
            .filter((item: any) => item?.acceptanceToken) // Ensure token exists
            .map((item: any) => ({
              id: item.acceptanceToken.toString(),
            }));
          
          results.push(...validPaths);
        }
      } catch (innerError) {
        // If one specific buyer's agreements fail, log it but keep looping
        console.error(`Error fetching agreements for buyer ${buyer._id}:`, innerError);
        continue; 
      }
    }

    return results;
  } catch (error) {
    // If the main DB connection or buyer fetch fails, return empty so build survives
    console.error('Main error in getAllAgreementsForBuild:', error);
    return [];
  }
}
