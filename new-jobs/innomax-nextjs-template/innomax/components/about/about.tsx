'use client';

import React from 'react';
import Link from 'next/link';
import { Fade } from 'react-awesome-reveal';
import Image from 'next/image';
import icon from '../../public/images/icon/magic.png';
import about1 from '../../public/images/icon/airdrop.png';
import about2 from '../../public/images/icon/people.png';
import about3 from '../../public/images/icon/microphone.png';

const About: React.FC = () => {
  return (
    <section id="about" className="about m-lr">
      <div className="about-wrapper sec-bg pos-rel pb-130 pt-130">
        <div className="container">
          <div className="sec-title--two text-center">
            <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
              <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
                <Image src={icon} alt="We are Innomax" />
                {' '}We are innomax
              </div>
            </Fade>
            <Fade direction="down" triggerOnce={false} duration={1500} delay={9}>
              <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                Committed to Your SEO Success
              </h2>
            </Fade>
          </div>

          <div className="row">
            {/* Left Column */}
            <div className="col-lg-6 mt-50">
              <div className="about-left">
                <h2 className="title">Core values</h2>

                <div className="about-item_box ul_li">
                  <div className="xb-item--icon">
                    <Image src={about1} alt="Innovation icon" />
                  </div>
                  <div className="xb-item--holder">
                    <p className="xb-item--content">
                      <span>Innovation:</span> Continuously refining SEO to stay ahead of search engine updates.
                    </p>
                  </div>
                </div>

                <div className="about-item_box ul_li">
                  <div className="xb-item--icon">
                    <Image src={about2} alt="Client Focus icon" />
                  </div>
                  <div className="xb-item--holder">
                    <p className="xb-item--content">
                      <span>Client Focus:</span> Your success drives us; we craft custom SEO solutions for impact.
                    </p>
                  </div>
                </div>

                <div className="about-item_box ul_li">
                  <div className="xb-item--icon">
                    <Image src={about3} alt="Transparency icon" />
                  </div>
                  <div className="xb-item--holder">
                    <p className="xb-item--content">
                      <span>Transparency:</span> Clear communication and honest reporting at every step.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-6 mt-50">
              <div className="about-right">
                <div className="xb-item--holder">
                  <h3 className="xb-item--title">Our Mission</h3>
                  <p className="xb-item--content">
                    Our mission is to boost online presence with cutting-edge SEO, driving organic traffic, increasing visibility, and delivering measurable results.
                  </p>
                </div>
                <div className="xb-item--holder">
                  <h3 className="xb-item--title">Our Vision</h3>
                  <p className="xb-item--content">
                    Our vision is to be a trusted leader in digital marketing, setting the standard for ethical SEO. We empower businesses to thrive with effective strategies.
                  </p>
                </div>
              </div>
            </div>

            {/* Button */}
            <div className="xb-btn text-center mt-90 wow fadeInUp" data-wow-duration="600ms">
              <Fade direction="up" triggerOnce={false} duration={1500} delay={9}>
                <Link href="/about" className="thm-btn thm-btn--aso">
                  Learn more about us
                </Link>
              </Fade>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
