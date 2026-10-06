// src/lib/getUsers.ts
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';

export async function getUsersForBuild() {
  try {
    await connectToDatabase();

    // Fetch UserProfiles, specifically looking for userId
    const profiles = await UserProfile.find({}, 'userId').lean();

    // Ensure we handle cases where profiles might be null/empty
    if (!profiles || !Array.isArray(profiles)) {
      return { data: [] };
    }

    // Filter out any profiles that might be missing a userId to avoid .toString() errors
    const combined = profiles
      .filter(profile => profile?.userId) 
      .map(profile => ({
        id: profile.userId.toString(),
      }));

    return { data: combined };

  } catch (error) {
    // This logs the error to your build console so you can debug,
    // but returns an empty array so 'npm run build' completes.
    console.error('Error in getUsersForBuild:', error);
    return { data: [] };
  }
}
