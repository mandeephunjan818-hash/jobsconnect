// components/home/IndustrieSectionFetcher.tsx (or keep it in page.tsx)
import { getCachedTopCategories } from '../../app/actions/categoryAction';
import IndustrieSectionClient from './IndustrieSectionClient';

export default async function IndustrieSectionFetcher() {
  const categories = await getCachedTopCategories();
  return <IndustrieSectionClient categories={categories} />;
}