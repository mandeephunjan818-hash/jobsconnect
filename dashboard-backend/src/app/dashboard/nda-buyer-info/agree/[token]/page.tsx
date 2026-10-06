// src/app/(admin)/admin/buyers/[id]/agreements/page.tsx
import AgreementsClientView from './Agreement';
import { getAllAgreementsForBuild } from '@/app/actions/BuyerAgreement';

export async function generateStaticParams() {
  // DIRECT OPTION: No nested fetches, no localhost, much faster build
  const paths = await getAllAgreementsForBuild();

  console.log(`Generated ${paths.length} static paths for agreements.`);

  return paths;
}

export default function AgreementsPage() {
  return (<AgreementsClientView />);
}
