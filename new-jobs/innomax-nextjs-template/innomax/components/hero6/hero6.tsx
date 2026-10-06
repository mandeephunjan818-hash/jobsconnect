import React from 'react';
import { Fade } from 'react-awesome-reveal';
import icon1 from '../../public/images/icon/check-mark.png';
import icon2 from '../../public/images/icon/arrow-black.png';
import icon3 from '../../public/images/hero/mobile-sms.png';
import hImg1 from '../../public/images/hero/hero-img06.png';
import hImg2 from '../../public/images/hero/hero-img05.png';

import Link from 'next/link';
import Image from 'next/image';

const Hero6: React.FC = () => {
  return (
    <section className="hero hero-style-four pos-rel pt-120">
      <div className="container">
        <div className="hero_wrap pt-90">
          <div className="row align-items-center mt-none-30">
            <div className="col-xl-7 col-lg-6 mt-30">
              <div className="xb-hero">
                <Fade direction="up" triggerOnce duration={1000} delay={9}>
                  <h1 className="xb-item--title wow fadeInUp" data-wow-duration="600ms">
                    AI - Powered <br /> help desk for <br /> fast support
                  </h1>
                </Fade>
                <Fade direction="up" triggerOnce duration={1200} delay={9}>
                  <p
                    className="xb-item--content wow fadeInUp"
                    data-wow-delay="150ms"
                    data-wow-duration="600ms"
                  >
                    90K+ Businesses with AI-powered Innomax for Fast Support
                  </p>
                </Fade>
                <Fade direction="up" triggerOnce duration={1400} delay={9}>
                  <ul
                    className="xb-item--item list-unstyled wow fadeInUp"
                    data-wow-delay="300ms"
                    data-wow-duration="600ms"
                  >
                    <li>
                      <span>
                        <Image src={icon1} alt="Check mark icon" />
                      </span>{' '}
                      Human-like conversations via voice, chat & email
                    </li>
                    <li>
                      <span>
                        <Image src={icon1} alt="Check mark icon" />
                      </span>{' '}
                      Speed and accuracy through in-house LLMs
                    </li>
                  </ul>
                </Fade>
                <Fade direction="up" triggerOnce duration={1400} delay={9}>
                  <div className="xb-btn mt-50 wow fadeInUp" data-wow-delay="450ms" data-wow-duration="600ms">
                    <Link href="/pricing" className="thm-btn thm-btn--three">
                      Start your free trial
                      <span>
                        <Image className="img--one" src={icon2} alt="Arrow icon" />
                        <Image className="img--two" src={icon2} alt="Arrow icon" />
                      </span>
                    </Link>
                  </div>
                </Fade>
              </div>
            </div>
            <div className="col-xl-5 col-lg-6 mt-30">
              <div className="hero-right_img pos-rel">
                <div className="hero-right-image">
                  <div>
                    <Image
                      className="wow fadeInLeft"
                      data-duration=".7s"
                      src={hImg1}
                      alt="Hero image 1"
                    />
                  </div>
                </div>
                <div className="xb-img">
                  <div>
                    <div
                      className="img img--one wow fadeInRight updown-3"
                      data-duration=".7s"
                      data-delay="1s"
                    >
                      <Image src={hImg2} alt="Hero image 2" />
                    </div>
                  </div>
                  <Fade direction="up" triggerOnce duration={1400} delay={9}>
                    <div>
                      <div className="img img--two wow fadeInUp" data-duration=".7s" data-delay="2s">
                        <Image src={icon3} alt="Mobile SMS icon" />
                      </div>
                    </div>
                  </Fade>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero6;
