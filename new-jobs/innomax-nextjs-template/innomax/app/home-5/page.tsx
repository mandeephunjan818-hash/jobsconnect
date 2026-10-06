import React, { Fragment } from 'react';
import Header5 from '../../components/header5/Header5';
import Hero5 from '../../components/hero5/hero5';
import FunFactSection from '../../components/Cloud-devops-components/FunFact/FunFact';
import ServiceSection from '../../components/Cloud-devops-components/ServiceSection/ServiceSection';
import CtaSection from '../../components/Cloud-devops-components/CtaSection/CtaSection';
import WorkFlow from '../../components/Cloud-devops-components/WorkFlow/WorkFlow';
import CtaSection2 from '../../components/Cloud-devops-components/CtaSection2/CtaSection2';
import FeaturesSection from '../../components/Cloud-devops-components/FeaturesSection/FeaturesSection';
import CloudBlogSection from '../../components/Cloud-devops-components/CloudBlogSection/CloudBlogSection';
import Footer from '../../components/Cloud-devops-components/Footer/Footer';
import Scrollbar from '../../components/scrollbar/scrollbar';


const HomePage5 = () => {

    return (
        <Fragment>
            <div className='cloud-and-devops'>
                <main className="page_content">
                    <Header5 />
                    <Hero5 />
                    <FunFactSection />
                    <ServiceSection />
                    <CtaSection />
                    <WorkFlow />
                    <CtaSection2 />
                    <FeaturesSection />
                    <CloudBlogSection />
                    <Scrollbar />
                </main>
                <Footer/>
            </div>
        </Fragment>
    )
};
export default HomePage5;