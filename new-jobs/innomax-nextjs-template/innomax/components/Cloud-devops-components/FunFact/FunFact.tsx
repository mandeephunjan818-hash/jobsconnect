'use client';

import React from 'react';
import { Fade } from 'react-awesome-reveal';
import CountUp from 'react-countup';
import Link from 'next/link';
import Image from 'next/image';

import shape1 from '../../../public/images/shape/fan-shape01.png';
import shape2 from '../../../public/images/shape/fan-shape02.png';

const FunFactSection: React.FC = () => {
  return (
    <section
      className="fanfact pos-rel z-1 pt-155 pb-175 overflow-hidden"
      style={{ backgroundColor: '#212877' }}
    >
      <div className="container">
        <div className="cd-fanfact-wrapper">
          {/* Section Title */}
          <div className="sec-title--five white-sec-title text-center mb-80">
            <Fade direction="up" triggerOnce={false} duration={1000} delay={9}>
              <div>
                <h2 className="title wow fadeInUp" data-wow-duration="600ms">
                  Seamlessly develop and deploy applications in the cloud
                </h2>
              </div>
            </Fade>
            <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
              <div>
                <p
                  className="content wow fadeInUp"
                  data-wow-delay="150ms"
                  data-wow-duration="600ms"
                >
                  Use our cloud DevOps consulting services to get the most value out of your cloud
                  infrastructure and DevOps initiatives.
                </p>
              </div>
            </Fade>
          </div>

          {/* Fun Fact Items */}
          <div className="cd-fanfact-inner ul_li_between mt-none-30">
            <div className="xb-item--item_box mt-30">
              <h3 className="xb-item--number xb-odm">
                <CountUp end={90} enableScrollSpy />
                <span className="suffix">%</span>
              </h3>
              <span className="xb-item--content">
                of businesses that <br /> adopt cloud reduced <br /> computing costs
              </span>
            </div>

            <div className="xb-item--item_box mt-30">
              <h3 className="xb-item--number xb-odm">
                <CountUp end={58} enableScrollSpy />
                <span className="suffix">%</span>
              </h3>
              <span className="xb-item--content">
                Increase in team productivity noted among organizations adopting DevOps
              </span>
            </div>

            <div className="xb-item--item_box mt-30">
              <h3 className="xb-item--number xb-odm">
                <CountUp end={30} enableScrollSpy />
                <span className="suffix">%</span>
              </h3>
              <span className="xb-item--content">
                Faster recovery from failures reported by companies implementing DevOps practices
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div
            className="xb-btn mt-95 text-center wow fadeInUp"
            data-wow-delay="000ms"
            data-wow-duration="600ms"
          >
            <Link href="/contact" className="thm-btn thm-btn--devops thm-btn--devops_yellow">
              Book a free consultation
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Shapes */}
      <div className="cd-sec-shape">
        <div className="shape shape--two">
          <Image src={shape1} alt="Decorative shape 1" />
        </div>
        <div className="shape shape--three">
          <Image src={shape2} alt="Decorative shape 2" />
        </div>
      </div>
    </section>
  );
};

export default FunFactSection;
