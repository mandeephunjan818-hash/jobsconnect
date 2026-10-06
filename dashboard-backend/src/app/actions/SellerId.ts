// src/lib/getBuyers.ts
import connectToDatabase from '@/lib/mongooes';
import BuyerRegistration from '@/modal/BuyerRegistration';

export async function getBuyersForBuild() {
  try {
    await connectToDatabase();

    // 1. Fetch only the _id field
    const buyers = await BuyerRegistration.find({}, '_id').lean();

    // 2. Return an empty array if the collection is empty
    if (!buyers || !Array.isArray(buyers)) {
      return { data: [] };
    }

    // 3. Filter out any documents missing an _id to prevent .toString() crashes
    const validBuyers = buyers
      .filter((buyer: any) => buyer?._id)
      .map((buyer: any) => ({
        ...buyer,
        _id: buyer._id.toString(), // Normalize the ID to a string
      }));

    return { data: validBuyers };

  } catch (error) {
    // Log the error for debugging but return an empty array to keep the build alive
    console.error('Error in getBuyersForBuild:', error);
    return { data: [] };
  }
}
