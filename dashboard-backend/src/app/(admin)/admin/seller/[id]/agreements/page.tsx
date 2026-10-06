// src/app/(admin)/admin/buyers/[id]/agreements/page.tsx
import AgreementsClientView from './AgreementsClientView';
import { getBuyersForBuild } from '@/app/actions/SellerId';

export async function generateStaticParams() {
  // DIRECT OPTION: No fetch, no localhost dependency
  const buyers = await getBuyersForBuild();

  return buyers?.data?.map((buyer: any) => ({
    id: buyer._id.toString(), // Must match the folder name [id]
  }));
}

export default function AgreementsPage() {
  return (<AgreementsClientView />);
}
