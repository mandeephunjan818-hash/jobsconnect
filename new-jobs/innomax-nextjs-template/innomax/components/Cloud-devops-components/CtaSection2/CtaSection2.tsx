import React from 'react';
import { Fade } from "react-awesome-reveal";
import Link from "next/link";
import Image from 'next/image';

import cta1 from '../../../public/images/cta/cta_icon_01.png';
import cta2 from '../../../public/images/cta/cta_icon_02.png';
import cta3 from '../../../public/images/cta/cta_icon_03.png';
import cta4 from '../../../public/images/cta/cta_icon_04.png';
import cta5 from '../../../public/images/cta/cta_icon_05.png';
import cta6 from '../../../public/images/cta/cta_icon_06.png';
import cta7 from '../../../public/images/cta/cta_icon_07.png';
import ctShape from '../../../public/images/cta/cta_shape.png';
import ctShape2 from '../../../public/images/shape/cta_shape2.png';
import ctShape3 from '../../../public/images/shape/cta_shape1.png';

const CtaSection2: React.FC = () => {
  return (
    <section className="cta cta-height pos-rel z-1 pt-165" style={{ backgroundColor: "#212877" }}>
      <div className="container">
        <div className="row align-items-end">
          <div className="col-12">
            <div className="cta-icons">
              <div className="icon icon--1">
                <Image data-parallax='{"x":-20,"y":-30}' src={cta1} alt="Tech stack icon 1" />
              </div>
              <div className="icon icon--2">
                <Image data-parallax='{"x":-30,"y":-20}' src={cta2} alt="Tech stack icon 2" />
              </div>
              <div className="icon icon--3">
                <Image data-parallax='{"x":-10,"y":-30}' src={cta3} alt="Tech stack icon 3" />
              </div>
              <div className="icon icon--4">
                <Image data-parallax='{"y":-40}' src={cta4} alt="Tech stack icon 4" />
              </div>
              <div className="icon icon--5">
                <Image data-parallax='{"x":10,"y":-30}' src={cta5} alt="Tech stack icon 5" />
              </div>
              <div className="icon icon--6">
                <Image data-parallax='{"x":30,"y":-20}' src={cta6} alt="Tech stack icon 6" />
              </div>
              <div className="icon icon--7">
                <Image data-parallax='{"x":20,"y":-30}' src={cta7} alt="Tech stack icon 7" />
              </div>
            </div>
            <div className="cta-image">
              <Image src={ctShape} alt="Call to action shape" />
            </div>
            <div className="cd-cta">
              <div className="sec-title--five text-center">
                <Fade direction="up" triggerOnce duration={1000} delay={9}>
                  <h2 className="title wow fadeInUp">
                    CLOUD & DEVOPS <br /> Tech Stack
                  </h2>
                </Fade>
              </div>
              <div className="xb-btn mt-20 text-center wow fadeInUp" data-wow-delay="150ms">
                <Fade direction="up" triggerOnce duration={1000} delay={9}>
                  <Link href="/contact" className="thm-btn thm-btn--devops thm-btn--devops_yellow">
                    Book a free consultation
                  </Link>
                </Fade>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="cd-sec-shape">
        <div className="shape shape--two">
          <Image src={ctShape2} alt="Decorative shape" />
        </div>
        <div className="shape shape--three">
          <Image src={ctShape3} alt="Decorative shape" />
        </div>
      </div>
    </section>
  );
};

export default CtaSection2;
