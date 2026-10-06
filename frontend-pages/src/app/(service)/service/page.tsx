import dynamic from "next/dynamic";

export const metadata = {
  title: "Service - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const Service = dynamic(() => import("@/components/service"), {
  loading: () => <p>Loading Service...</p>,
  ssr: true,
});

export default function Index() {
  return <Service />;
}
