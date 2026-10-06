// src/app/(admin)/admin/seller/[id]/agreements/page.tsx
import AgreementsClientView from './Agreement';
import { getAllBusinessAgreementsForBuild } from '@/app/actions/BusinessAgreement';

export async function generateStaticParams() {
  // DIRECT OPTION: No network calls, no ECONNREFUSED errors
  const paths = await getAllBusinessAgreementsForBuild();

  console.log(`Generated ${paths.length} static paths for business agreements.`);

  return paths;
}

export default function AgreementsPage() {
  return (<AgreementsClientView />);
}
