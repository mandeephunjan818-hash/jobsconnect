import React from 'react';
import { Fade, Zoom } from "react-awesome-reveal";
import Link from "next/link";
import Image from 'next/image';

import icon1 from '../../../public/images/icon/cd-fea-icon01.svg';
import icon2 from '../../../public/images/icon/cd-fea-icon02.svg';
import shape1 from '../../../public/images/shape/feature_shape1.png';
import shape2 from '../../../public/images/shape/feature_shape2.png';

const FeaturesSection: React.FC = () => {
  return (
    <section className="feature pos-rel z-1 pt-150 pb-185">
      <div className="container">
        <div className="cd-feature text-center pos-rel">
          <Fade direction="up" triggerOnce duration={1000} delay={9}>
            <h2 className="title wow skewIn" data-wow-duration="600ms">
              Easily deploy your app in the cloud using modern and efficient tech stack
            </h2>
          </Fade>

          <Fade direction="up" triggerOnce duration={1000} delay={9}>
            <div className="xb-btn-wrapper text-center mt-50 wow fadeInUp" data-wow-duration="600ms">
              <Link href="/contact" className="xb-hover-btn xb-btn-item xb-btn-circle xb-element-parallax">
                <span className="xb-btn-circle-arrow">
                  <i className="far fa-long-arrow-right"></i>
                </span>
                <span className="xb-btn-circle-text">
                  Let’s Discuss <br /> about that
                </span>
                <i className="xb-btn-circle-dot"></i>
              </Link>
            </div>
          </Fade>

          <div className="xb-shape">
            <div className="shape shape--one wow zoomIn" data-wow-duration="600ms">
              <Zoom triggerOnce duration={1000} delay={9}>
                <Image data-parallax='{"y":40}' src={icon1} alt="Feature icon 1" />
              </Zoom>
            </div>
            <div className="shape shape--two wow zoomIn" data-wow-delay="150ms" data-wow-duration="600ms">
              <Zoom triggerOnce duration={1000} delay={9}>
                <Image data-parallax='{"y":-40}' src={icon2} alt="Feature icon 2" />
              </Zoom>
            </div>
          </div>
        </div>
      </div>

      <div className="cd-sec-shape">
        <div className="shape shape--one">
          <Image src={shape1} alt="Decorative shape 1" />
        </div>
        <div className="shape shape--four">
          <Image src={shape2} alt="Decorative shape 2" />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
