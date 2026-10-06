// components/faq/FaqSectionFetcher.tsx
import { unstable_cache } from 'next/cache';
import { getFaqs } from '../../../app/actions/faqAction';
import FaqSectionClient from './FaqSectionClient';

// ISR: cached for 1 hour, revalidates when new requests come in after that
const getCachedFaqs = unstable_cache(
  () => getFaqs(),
  ['faq-section-data'],
  { revalidate: 1, tags: ['faqs'] }, // revalidate every hour
);

export default async function FaqSectionFetcher() {
  const sections = await getCachedFaqs();

  // Flatten all questions across sections and assign sequential numbers
  let counter = 1;
  const flatFaqs = sections.flatMap((section: any) =>
    section.questions.map((q: any) => ({
      number: String(counter++),
      question: q.question,
      answer: q.answer,
    })),
  );

  // Optional: limit to the first 8 (like the original), or remove to show all
  const limitedFaqs = flatFaqs.slice(0, 8);

  return <FaqSectionClient faqs={limitedFaqs} />;
}