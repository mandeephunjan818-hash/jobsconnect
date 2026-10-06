import React, { Fragment } from 'react';
import Header from '../../components/header/Header';
import Hero from '../../components/hero/hero';
import PartnerSection from '../../components/PartnerSection';
import About from '../../components/about/about';
import ServiceSection from '../../components/ServiceSection/ServiceSection';
import ProjectSection from '../../components/ProjectSection/ProjectSection';
import WorkProcess from '../../components/WorkProcess/WorkProcess';
import IndustrieSection from '../../components/IndustrieSection/IndustrieSection';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import Testimonial from '../../components/Testimonial/Testimonial';
import TeamSection from '../../components/TeamSection/TeamSection';
import CtaSection from '../../components/CtaSection/CtaSection';
import FaqSection from '../../components/FaqSection/FaqSection';
import Footer from '../../components/footer/Footer';
import Scrollbar from '../../components/scrollbar/scrollbar';


const HomePage = () => {

    return (
        <Fragment>
            <div className='body_wrap sco_agency'>
                <Header />
                <main className="page_content">
                    <Hero />
                    <PartnerSection />
                    <About />
                    <ServiceSection />
                    <ProjectSection />
                    <WorkProcess />
                    <IndustrieSection />
                    <Testimonial />
                    <FeaturesSection />
                    <TeamSection />
                    <FaqSection />
                    <CtaSection /> 
                </main>
                <Footer />
                <Scrollbar />
            </div>
        </Fragment>
    )
};
export default HomePage;