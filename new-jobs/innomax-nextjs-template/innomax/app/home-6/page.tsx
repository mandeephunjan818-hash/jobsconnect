import React, { Fragment } from 'react';
import Header6 from '../../components/header6/Header6';
import Hero6 from '../../components/hero6/hero6';
import PartnerSection from '../../components/Help-Desk-Components/PartnerSection';
import FeaturesService from '../../components/Help-Desk-Components/FeaturesService/FeaturesService';
import VideoService from '../../components/Help-Desk-Components/VideoService/VideoService';
import FeatureSection from '../../components/Help-Desk-Components/FeatureSection/FeatureSection';
import FunFactSection from '../../components/Help-Desk-Components/FunFact/FunFact';
import IntegrationSection from '../../components/Help-Desk-Components/IntegrationSection/IntegrationSection';
import Testimonial from '../../components/Help-Desk-Components/Testimonial/Testimonial';
import HelpDeskBlogSection from '../../components/Help-Desk-Components/HelpDeskBlogSection/HelpDeskBlogSection';
import IndustrieSection from '../../components/Help-Desk-Components/IndustrieSection/IndustrieSection';
import CtaSection from '../../components/Help-Desk-Components/CtaSection/CtaSection';
import Footer from '../../components/Help-Desk-Components/Footer/Footer';
import Scrollbar from '../../components/scrollbar/scrollbar';


const HomePage6 = () => {

    return (
        <Fragment>
            <div className='help_desk'>
                <main className="page_content">
                    <Header6 />
                    <Hero6 />
                    <PartnerSection />
                    <FeaturesService />
                    <VideoService />
                    <FeatureSection />
                    <FunFactSection />
                    <IntegrationSection />
                    <Testimonial />
                    <HelpDeskBlogSection />
                    <IndustrieSection />
                    <CtaSection />
                    <Scrollbar />
                </main>
                <Footer/>
            </div>
        </Fragment>
    )
};
export default HomePage6;