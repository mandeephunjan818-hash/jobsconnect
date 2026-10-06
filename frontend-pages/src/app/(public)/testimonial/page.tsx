import dynamic from "next/dynamic";

export const metadata = {
  title: "Testimonial - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const Testimonial = dynamic(() => import("@/components/testimonial"), {
  loading: () => <p>Loading testimonials...</p>,
  ssr: true,
});

export default function Index() {
  return <Testimonial />;
}
