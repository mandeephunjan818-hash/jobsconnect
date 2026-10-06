'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Marquee from 'react-fast-marquee';
import { Fade } from 'react-awesome-reveal';

import hImg1 from '../../public/images/hero/cd-hero_img.png';
import hImg2 from '../../public/images/shape/arrow_shape.png';
import brand1 from '../../public/images/brand/cd-clutch01.png';
import brand2 from '../../public/images/brand/cd-aws.png';
import brand3 from '../../public/images/brand/cd-goodfirms.png';
import shape from '../../public/images/shape/cd-circle-shape.png';

const Hero5: React.FC = () => {
  return (
    <section className="hero hero-style-five pos-rel z-1 pt-120 pb-100 overflow-hidden">
      <div className="container">
        <div className="hero_wrap pt-100">
          <div className="row align-items-center mt-none-30">
            {/* Left Column */}
            <div className="col-lg-7 mt-30">
              <div className="xb-hero">
                <Fade direction="up" triggerOnce={false} duration={1000} delay={9}>
                  <div>
                    <h1 className="xb-item--title wow skewIn" data-wow-duration="600ms">
                      Cloud & Devops <span>services</span>
                    </h1>
                  </div>
                </Fade>
                <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
                  <div>
                    <p className="xb-item--content wow fadeInUp" data-wow-delay="150ms" data-wow-duration="600ms">
                      seamlessly develop and deploy applications in the cloud
                    </p>
                  </div>
                </Fade>
                <Fade direction="up" triggerOnce={false} duration={1400} delay={9}>
                  <div>
                    <div className="xb-btn mt-50 wow fadeInUp" data-wow-delay="300ms" data-wow-duration="600ms">
                      <Link href="/contact" className="thm-btn thm-btn--devops">
                        Book a free consultation
                      </Link>
                    </div>
                  </div>
                </Fade>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-5 mt-30">
              <Fade direction="right" triggerOnce={false} duration={1400} delay={9}>
                <div>
                  <div className="hero-right_img wow fadeInRight" data-wow-delay="100ms" data-wow-duration="600ms">
                    <Image src={hImg1} alt="Cloud and DevOps Illustration" />
                    <div className="cd-hero-shape">
                      <Image className="xbzoominzoomup" src={hImg2} alt="Arrow Shape" />
                    </div>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        </div>

        {/* Brand Marquee */}
        <div className="cd-brand cd-marquee-left">
          <Marquee speed={50} gradient={false}>
            <div className="cd-brand-item">
              <div className="xb-item--img">
                <Image src={brand1} alt="Clutch Logo" />
              </div>
              <h3 className="xb-item--title">
                Top Rated Cloud & DevOps Service Provider <span>(5.0 Rating)</span>
              </h3>
            </div>

            <div className="cd-brand-item">
              <div className="xb-item--img">
                <Image src={brand2} alt="AWS Partner" />
              </div>
              <h3 className="xb-item--title">
                <span>Partner - </span>Certified AWS Partner for Cloud Solutions
                <span>(5.0 Rating)</span>
              </h3>
            </div>

            <div className="cd-brand-item">
              <div className="xb-item--img">
                <Image src={brand3} alt="GoodFirms" />
              </div>
              <h3 className="xb-item--title">
                Highly Recommended Cloud Solutions with Excellent Reviews <span>(4.89 Rating)</span>
              </h3>
            </div>
          </Marquee>
        </div>

        {/* Background Shapes */}
        <div className="xb-shape">
          <div className="shape shape--one">
            <Image src={shape} alt="Circle Shape" />
          </div>
          <div className="shape shape--two"></div>
          <div className="shape shape--three"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero5;
