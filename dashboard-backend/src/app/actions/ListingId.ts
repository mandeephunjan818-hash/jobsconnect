// src/lib/getListings.ts
import dbConnect from '@/lib/mongooes';
import Listing from '@/modal/Listing';

export async function getListingsForBuild() {
  try {
    await dbConnect();

    // 1. Fetch active listings, only getting the _id field
    const listings = await Listing.find({ isActive: true }, '_id').lean();

    // 2. Safety check for empty or null results
    if (!listings || !Array.isArray(listings)) {
      return { data: [] };
    }

    // 3. Filter and map: ensure _id exists before calling .toString()
    const data = listings
      .filter((doc: any) => doc?._id)
      .map((doc: any) => ({
        id: doc._id.toString(),
      }));

    return { data };

  } catch (error) {
    // Log the error for your build history but return an empty array
    console.error('Error in getListingsForBuild:', error);
    return { data: [] };
  }
}