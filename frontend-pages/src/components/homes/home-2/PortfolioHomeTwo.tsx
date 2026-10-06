import { getCachedTopCategories } from '../../../app/actions/categoryAction';
import PortfolioHomeTwo from './PortfolioHomeTwoClient';

export default async function PortfolioFetcher() {
  const categories = await getCachedTopCategories();
  return <PortfolioHomeTwo categories={categories} />;
}