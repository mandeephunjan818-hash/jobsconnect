// src/app/(admin)/admin/users/[id]/page.tsx (or similar path)
import UserDetails from './UserDetails';
import { getUsersForBuild } from '@/app/actions/UserId';

export async function generateStaticParams() {
    // DIRECT OPTION: No fetch, no tokens, no ECONNREFUSED
    const users = await getUsersForBuild();

    console.log('Fetched users for static params:', users);

    return users?.data?.map((user: any) => ({
        id: user.id, // Already converted to string in the lib function
    }));
}

export default function UserPage() {
    return (<UserDetails />);
}
