'use client';

import React from 'react';
import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';
import { Fade } from 'react-awesome-reveal';

import Services from '../../api/service';
import sIcon from '../../public/images/icon/arrow-black.svg';
import hIcon from '../../public/images/icon/ser-01.svg';

interface ServiceItem {
  title: string;
  description: string;
  slug: string;
  sImg?: StaticImageData; // optional in case some items don't have an image
}

interface ServiceSectionProps {
  services?: ServiceItem[];
}

const ServiceSection: React.FC<ServiceSectionProps> = ({ services = Services }) => {
  return (
    <section className="service pt-140 pb-140">
      <div className="container">
        <div className="row mt-none-30">
          {/* Left Column - Info */}
          <div className="col-lg-4 mt-30">
            <div className="service-info">
              <div className="sec-title--two">
                <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
                  <div>
                    <span className="sub-title">
                      <Image src={hIcon} alt="Feature services icon" />
                      Feature-services
                    </span>
                  </div>
                </Fade>
                <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
                  <div>
                    <h2 className="title">
                      Growth with <br /> SEO services
                    </h2>
                  </div>
                </Fade>
                <Fade direction="up" triggerOnce={false} duration={1400} delay={9}>
                  <div>
                    <p className="content">
                      SEO services boost visibility and organic traffic, driving leads and growth.
                    </p>
                  </div>
                </Fade>
              </div>

              <div className="xb-btn mt-50">
                <Fade direction="up" triggerOnce={false} duration={1600} delay={9}>
                  <div>
                    <Link
                      href="/service"
                      className="thm-btn thm-btn--aso thm-btn--aso_yellow"
                    >
                      View more services
                    </Link>
                  </div>
                </Fade>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="col-lg-4 col-md-6 mt-30">
            <div className="service-all_item">
              {services.slice(0, 3).map((service, index) =>
                service.title ? (
                  <div className="service-box" key={`left-${index}`}>
                    <div className="service-item">
                      <div className="xb-item--holder mb-85">
                        <h3 className="xb-item--title">{service.title}</h3>
                        <span className="xb-item--contact">{service.description}</span>
                      </div>
                      <div className="xb-item--icon ul_li_between">
                        <div className="xb-item--img">
                          {service.sImg ? (
                            <Image src={service.sImg} alt={service.title} />
                          ) : (
                            <Image src={hIcon} alt={service.title} /> // fallback image
                          )}
                        </div>
                        <Link
                          href={'/service-single'}
                          className="xb-item--arrow"
                        >
                          <Image src={sIcon} alt="Arrow icon" />
                        </Link>
                      </div>
                      <Link
                        href={'/service-single'}
                        className="xb-overlay"
                      ></Link>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-lg-4 col-md-6 mt-30">
            <div className="service-all_item">
              {services.slice(3, 6).map((service, index) =>
                service.title ? (
                  <div className="service-box" key={`right-${index}`}>
                    <div className="service-item">
                      <div className="xb-item--holder mb-85">
                        <h3 className="xb-item--title">{service.title}</h3>
                        <span className="xb-item--contact">{service.description}</span>
                      </div>
                      <div className="xb-item--icon ul_li_between">
                        <div className="xb-item--img">
                          {service.sImg ? (
                            <Image src={service.sImg} alt={service.title} />
                          ) : (
                            <Image src={hIcon} alt={service.title} /> // fallback
                          )}
                        </div>
                        <Link
                          href={'/service-single'}
                          className="xb-item--arrow"
                        >
                          <Image src={sIcon} alt="Arrow icon" />
                        </Link>
                      </div>
                      <Link
                        href={'/service-single'}
                        className="xb-overlay"
                      ></Link>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
