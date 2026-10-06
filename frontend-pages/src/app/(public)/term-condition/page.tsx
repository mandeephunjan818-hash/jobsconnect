import dynamic from "next/dynamic";

export const metadata = {
  title: "Term Condition - Luminix - IT Solution & Technology Next JS Template",
  description: "A simple Next.js app using the App Router",
};

const TermCondition = dynamic(() => import("@/components/TermCondition"), {
  loading: () => <p>Loading terms and conditions...</p>,
  ssr: true,
});

export default function Index() {
  return <TermCondition />;
}
