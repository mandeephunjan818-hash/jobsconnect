import dynamic from "next/dynamic";

export const metadata = {
  title: "Coming Soon - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const ComingSoon = dynamic(() => import("@/components/CoomingSoon"), {
  loading: () => <p>Loading Coming Soon page...</p>,
  ssr: true,
});

export default function Index() {
  return <ComingSoon />;
}
