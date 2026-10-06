import React from 'react';
import Link from "next/link";
import { Fade } from "react-awesome-reveal";
import icon from '../../../public/images/icon/cross-x.svg';
import icon1 from '../../../public/images/icon/arrow-black.png';
import cImg from '../../../public/images/cta/massage-text01.png';
import cImg2 from '../../../public/images/cta/massage-text02.png';
import line from '../../../public/images/cta/color-line.jpg';
import Image from 'next/image';

const CtaSection: React.FC = () => {
  return (
    <section className="cta pos-rel pt-130 pb-135" style={{ backgroundColor: '#f6f0e6' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            <div className="hd-cta text-center">
              <div className="sec-title--two sec-title--four">
                <Fade direction='up' triggerOnce duration={1000} delay={9}>
                  <div>
                    <div className="sub-title wow fadeInUp" data-wow-duration="600ms">
                      <Image src={icon} alt="" />
                      Join the best
                    </div>
                  </div>
                </Fade>
                <Fade direction='up' triggerOnce duration={1000} delay={9}>
                  <div>
                    <h2 className="title wow fadeInUp" data-wow-delay="150ms" data-wow-duration="600ms">
                      Powering 90,000+ of the best customer experiences
                    </h2>
                  </div>
                </Fade>
              </div>
              <Fade direction='up' triggerOnce duration={1000} delay={9}>
                <div>
                  <div className="xb-btn text-center mt-45 wow fadeInUp" data-wow-delay="300ms" data-wow-duration="600ms">
                    <Link href="/pricing" passHref className="thm-btn thm-btn--three">
                        Start your free trial
                        <span>
                          <Image className="img--one" src={icon1} alt="" />
                          <Image className="img--two" src={icon1} alt="" />
                        </span>
                      </Link>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        </div>
      </div>
      <div className="hd-cta_shape">
        <div>
          <div className="shape shape--one wow fadeInLeft" data-wow-delay="000ms" data-wow-duration="600ms">
            <Image src={cImg} alt="" />
          </div>
        </div>
        <div>
          <div className="shape shape--two wow fadeInRight" data-wow-delay="100ms" data-wow-duration="600ms">
            <Image src={cImg2} alt="" />
          </div>
        </div>
        <div>
          <div className="shape shape--three">
            <Image src={line} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
