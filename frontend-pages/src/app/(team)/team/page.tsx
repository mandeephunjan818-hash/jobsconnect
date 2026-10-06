import dynamic from "next/dynamic";

export const metadata = {
  title: "Team - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const Team = dynamic(() => import("@/components/team"), {
  loading: () => <p>Loading team...</p>,
  ssr: true,
});

export default function Index() {
  return <Team />;
}
