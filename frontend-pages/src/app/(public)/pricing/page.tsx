import dynamic from "next/dynamic";

export const metadata = {
  title: "Pricing - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const Pricing = dynamic(() => import("@/components/pricing"), {
  loading: () => <p>Loading Pricing...</p>,
  ssr: true,
});

export default function Index() {
  return <Pricing />;
}
