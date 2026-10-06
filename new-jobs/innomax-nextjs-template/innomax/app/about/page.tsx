'use client';

import React, { Fragment } from 'react';
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar';
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from "../../public/images/icon/magic-icon.svg"
import FeaturesSection from './Features';
import WhyChoose from './WhyChoose';
import FunfactSection from './Funfact';
import Roadmap from './Roadmap';
import GallerySection from '../career/Gallery';
import Image from 'next/image';

const AboutUsPage: React.FC = () => {
  return (
    <Fragment>
      <div className="body_wrap sco_agency">
        <Header />
        <section
          className="page-title pt-200 pos-rel bg_img"
          style={{ backgroundImage: `url(/images/bg/page_bg01.jpg)` }}
        >
          <div className="container">
            <div className="page-title-wrap">
              <div className="row mt-none-30 align-items-end">
                <div className="col-xl-9 col-lg-8 mt-30">
                  <div className="page-title-box">
                    <span className="sub-title">
                      <Image src={icon} alt="Magic Icon" />
                      About Innomax
                    </span>
                    <h2 className="title">
                      Unlocking new heights of online success: how our SEO agency transforms visibility and growth
                    </h2>
                  </div>
                </div>
                <div className="col-xl-3 col-lg-4 mt-30">
                  <div className="count-box">
                    <h2 className="number">
                      12 <span className="suffix">+</span>
                    </h2>
                    <span className="text">Years of experience</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="about-video pt-75">
          <div className="container">
            <div className="career_video">
              <video loop muted playsInline autoPlay>
                <source src="/images/video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>

        <FeaturesSection />
        <div style={{ backgroundColor: '#f6f6f8' }}>
          <WhyChoose />
          <FunfactSection />
        </div>
        <Roadmap />
        <GallerySection pClass="pt-130" />
        <CtaSection />
      </div>
      <Footer />
      <Scrollbar />
    </Fragment>
  );
};

export default AboutUsPage;
