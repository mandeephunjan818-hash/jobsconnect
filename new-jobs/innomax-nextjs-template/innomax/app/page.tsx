import React from 'react';
import Hero3 from '../components/hero3/hero3';
import DataSolutioBlogSection from '../components/data-solutions-components/DataSolutioBlogSection/DataSolutioBlogSection';
import DataSolutionFaqSection from '../components/data-solutions-components/DataSolutionFaqSection/DataSolutionFaqSection';
import IndustrieSection from '../components/IndustrieSection/IndustrieSection';
import Testimonial from '../components/Testimonial/Testimonial';
import { getJobSearchIndex } from './actions/jobSearchData';
import BlogPreviewSection from '../components/BlogList/BlogPreviewSection';


const HomePage = async () => {
    const searchIndex = await getJobSearchIndex();

    return (
        <>
            <Hero3 searchIndex={searchIndex} />
            <DataSolutioBlogSection />
            <IndustrieSection />
            <BlogPreviewSection />
            <DataSolutionFaqSection />
            <Testimonial />
        </>
    )
};
export default HomePage;