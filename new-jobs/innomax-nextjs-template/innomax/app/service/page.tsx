'use client';

import React, { Fragment } from 'react';
import Link from 'next/link';
import Services from '../../api/service';
import WorkProcess from '../../components/WorkProcess/WorkProcess';
// import Testimonial from '../../components/Testimonial/Testimonial';
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar';
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from '../../public/images/icon/ser-01.svg';
import sIcon from '../../public/images/icon/arrow-black.svg';
import Image, { StaticImageData } from 'next/image';

import fallbackImg from '../../public/images/service/service-img01.jpg';

interface Service {
  title?: string;
  description?: string;
  slug: string;
  sImg?: StaticImageData;
}

const ServicePage: React.FC = () => {
  return (
    <Fragment>
      <div className="body_wrap sco_agency">
        <Header />

        {/* Page Title Section */}
        <section
          className="page-title pt-200 pos-rel bg_img"
          style={{ backgroundImage: `url('/images/bg/page_bg01.jpg')` }}
        >
          <div className="container">
            <div className="page-title-wrap">
              <div className="row mt-none-30 align-items-end">
                <div className="col-lg-9 mt-30">
                  <div className="page-title-box">
                    <span className="sub-title">
                      <Image src={icon} alt="Icon" />
                      Main Services
                    </span>
                    <h2 className="title">
                      Discover our comprehensive <br /> SEO services to boost your <br /> online presence
                    </h2>
                  </div>
                </div>
                <div className="col-lg-3 mt-30">
                  <div className="count-box">
                    <h2 className="number">09</h2>
                    <span className="text">
                      Professional top <br /> services
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="service pt-65 pb-130">
          <div className="container">
            <div className="row mt-none-30">
              {Services.slice(0, 6).map((service: Service, index: number) =>
                service.title ? (
                  <div className="col-lg-4 col-md-6 mt-30" key={index}>
                    <div className="service-box">
                      <div className="service-item">
                        <div className="xb-item--holder mb-85">
                          <h3 className="xb-item--title">{service.title}</h3>
                          {service.description && (
                            <span className="xb-item--contact">{service.description}</span>
                          )}
                        </div>
                        <div className="xb-item--icon ul_li_between">
                          <div className="xb-item--img">
                            <Image
                              src={service.sImg || fallbackImg}
                              alt={service.title}
                              width={80}
                              height={80}
                            />
                          </div>
                          <Link
                            href="/service-single"
                            className="xb-item--arrow"
                            aria-label={`Read more about ${service.title}`}
                          >
                            <Image src={sIcon} alt="Arrow Icon" width={24} height={24} />
                          </Link>
                        </div>
                        <Link
                          href="/service-single"
                          className="xb-overlay"
                          aria-label={`Navigate to ${service.title} service page`}
                        />
                      </div>
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* CTA Button */}
            <div
              className="xb-btn text-center mt-60 wow fadeInUp"
              data-wow-delay="450ms"
              data-wow-duration="600ms"
            >
              <Link href="/contact" className="thm-btn thm-btn--aso thm-btn--aso_yellow">
                Book a free consultation
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Sections */}
        <WorkProcess />
        {/* <Testimonial /> */}
        <CtaSection />
      </div>

      <Footer />
      <Scrollbar />
    </Fragment>
  );
};

export default ServicePage;
