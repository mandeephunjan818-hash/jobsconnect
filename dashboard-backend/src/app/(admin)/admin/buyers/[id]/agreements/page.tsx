import AgreementsClientView from './AgreementsClientView';

import { getBusinessRegistrationsForBuild } from '@/app/actions/BuyersId';

export async function generateStaticParams() {
  // DIRECT OPTION: No fetch, no domain, no ECONNREFUSED
  const buyers = await getBusinessRegistrationsForBuild();

  console.log('Fetched buyers for static params:', buyers);

  return buyers?.data?.map((buyer: any) => ({
    id: buyer._id.toString(),
  }));
}


export default function AgreementsPage() {
  return (<AgreementsClientView />);
}
