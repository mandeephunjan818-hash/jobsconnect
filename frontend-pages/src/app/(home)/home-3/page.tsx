import dynamic from "next/dynamic";

export const metadata = {
  title: "Luminix Home 3 - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const HomeThree = dynamic(() => import("@/components/homes/home-3"), {
  loading: () => <p>Loading Home 3...</p>,
  ssr: true,
});

export default function Index() {
  return <HomeThree />;
}
