import dynamic from "next/dynamic";

export const metadata = {
  title: "Team Details - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const SingleTeam = dynamic(() => import("@/components/SingleTeam"), {
  loading: () => <p>Loading team details...</p>,
  ssr: true,
});

export default function Index() {
  return <SingleTeam />;
}
