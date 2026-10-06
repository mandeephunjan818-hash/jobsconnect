'use client';

import React, { Fragment } from 'react';
import CountUp, { useCountUp } from 'react-countup';
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar';
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from '../../public/images/icon/dollar-icon.svg';
import sImg from '../../public/images/hero/cd-img.png';
import sImg2 from '../../public/images/shape/brd_shape.png';
import PricingSection from './Pricing';
import FaqSection from '../../components/FaqSection/FaqSection';
import Image from 'next/image';

const PricingPage: React.FC = () => {
  useCountUp({
    end: 56656,
    ref: 'counter',
    enableScrollSpy: true,
    scrollSpyDelay: 1000,
  });

  return (
    <Fragment>
      <div className="body_wrap sco_agency">
        <Header />
        <section
          className="page-title pt-200 pos-rel bg_img"
          style={{ backgroundImage: `url('/images/bg/page_bg01.jpg')` }}
        >
          <div className="container">
            <div className="page-title-wrap pg-title-wrap">
              <div className="row mt-none-30 align-items-start">
                <div className="col-lg-8 mt-30">
                  <div className="page-title-box">
                    <span className="sub-title">
                      <Image src={icon} alt="Dollar Icon" />
                      {' '}Simple pricing
                    </span>
                    <h2 className="title">
                      Choose the SEO package <br /> that fits your business and <br /> drives real results
                    </h2>
                  </div>
                </div>
                <div className="col-lg-4 mt-30">
                  <div className="pg-img-right pos-rel">
                    <Image src={sImg} alt="Pricing illustration" />
                    <div className="pg-arrow-shape">
                      <Image className="xbzoominzoomup" src={sImg2} alt="Arrow shape" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fanfact pg-fan-bg pt-100 pb-125">
          <div className="container">
            <div className="pg-fanfact-wrap ul_li_between mt-none-30">
              <div className="ap-fanfact-item pg-fanfact-item mt-30">
                <h2 className="xb-item--number">
                  <CountUp end={65} enableScrollSpy />
                  %
                </h2>
                <span className="xb-item--text">More website traffic</span>
                <p className="xb-item--content">
                  Our clients experience a 65% increase in organic traffic year-over-year.
                </p>
              </div>
              <div className="ap-fanfact-item pg-fanfact-item mt-30">
                <h2 className="xb-item--number">
                  <CountUp end={48} enableScrollSpy />
                  %
                </h2>
                <span className="xb-item--text">Conversion rate growth</span>
                <p className="xb-item--content">
                  Clients grow their conversion rates by 48% annually with our SEO strategies.
                </p>
              </div>
              <div className="ap-fanfact-item pg-fanfact-item mt-30">
                <h2 className="xb-item--number">
                  <CountUp end={55} enableScrollSpy />
                  %
                </h2>
                <span className="xb-item--text">Higher search rankings</span>
                <p className="xb-item--content">
                  Our clients see a 55% boost in search rankings within the first 6 months.
                </p>
              </div>
            </div>
          </div>
          <span id="counter" className="d-none" />
        </section>

        <PricingSection />
        <FaqSection />
        <CtaSection />
      </div>
      <Footer />
      <Scrollbar />
    </Fragment>
  );
};

export default PricingPage;
