import React from 'react';
import Link from 'next/link';
import { Fade } from 'react-awesome-reveal';
import Image from 'next/image';

import cta1 from '../../../public/images/team/cd-team.png';
import cta2 from '../../../public/images/shape/line_shape02.svg';

const CtaSection = () => {
  return (
    <section
      className="cta cta-bg pos-rel z-1 pt-160 o-hidden"
      style={{
        backgroundColor: '#212877',
        backgroundImage: 'url(/images/bg/cta_bg.jpg)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <div className="container">
        <div className="sec-title--five cta-sec-title text-center white-sec-title">
          <Fade direction="up" triggerOnce={false} duration={1000} delay={9}>
            <h2
              className="title wow fadeInUp"
              data-wow-duration="600ms"
            >
              Improve your development efficiency with managed Cloud and DevOps services
            </h2>
          </Fade>
        </div>
      </div>

      <div className="cd-team-member pos-rel">
        <Fade direction="up" triggerOnce={false} duration={1000} delay={9}>
          <div className="xb-img wow fadeInUp" data-wow-delay="200ms" data-wow-duration="600ms">
            <Image src={cta1} alt="Team working on DevOps and Cloud services" />
          </div>
        </Fade>

        <div className="xb-shape">
          <Image className="xbzoominzoomup" src={cta2} alt="Decorative line shape" />
        </div>

        <div className="xb-btn">
          <Link href="/contact" className="thm-btn thm-btn--devops thm-btn--devops_yellow">
            Book a free consultation
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
