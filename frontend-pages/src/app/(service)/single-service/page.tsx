import dynamic from "next/dynamic";

export const metadata = {
  title: "Service Details - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const SingleService = dynamic(() => import("@/components/SingleService"), {
  loading: () => <p>Loading service details...</p>,
  ssr: true,
});

export default function Index() {
  return <SingleService />;
}
