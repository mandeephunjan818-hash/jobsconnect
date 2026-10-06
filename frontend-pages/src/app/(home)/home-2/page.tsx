import dynamic from "next/dynamic";

export const metadata = {
  title: "Luminix Home 2 - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const HomeTwo = dynamic(() => import('@/components/homes/home-2'), {
  loading: () => <p>Loading Home 2...</p>,
  ssr: true,
});

export default function Index() {
  return <HomeTwo />;
}
