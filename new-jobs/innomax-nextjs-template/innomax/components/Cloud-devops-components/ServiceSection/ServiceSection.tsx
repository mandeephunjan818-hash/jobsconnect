'use client';

import React from 'react';
import { Fade } from 'react-awesome-reveal';
import Services from '../../../api/service';
import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';

import simg from '../../../public/images/shape/ser-shape01.png';
import simg2 from '../../../public/images/shape/ser-shape02.png';

interface ServiceItem {
  id?: number;
  title: string;
  slug: string;
  sIcon?: StaticImageData;
  bgClass?: string;
}

const ServiceSection: React.FC = () => {
  const serviceList: ServiceItem[] = Services.slice(19, 28);

  return (
    <section className="service pos-rel z-1 pt-160 pb-150">
      <div className="container">
        {/* Section Heading */}
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="sec-title--five text-center mb-35">
              <Fade direction="up" triggerOnce={false} duration={1000} delay={9}>
                <h2 className="title wow fadeInUp" data-wow-duration="600ms">
                  Cloud & DevOps <br /> Services
                </h2>
              </Fade>
              <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
                <p
                  className="content wow fadeInUp"
                  data-wow-delay="150ms"
                  data-wow-duration="600ms"
                >
                  Use our cloud DevOps consulting services to get the most value out of your cloud
                  infrastructure and DevOps initiatives.
                </p>
              </Fade>
            </div>
          </div>
        </div>

        {/* Service Cards */}
        <div className="row">
          {serviceList.map((service, index) => (
            <div className="col-lg-4 col-md-6" key={service.slug || index}>
              <div className="cd-service-item">
                {service.sIcon && (
                  <div className="xb-item--icon">
                    <Image src={service.sIcon} alt={`${service.title} icon`} width={60} height={60} />
                  </div>
                )}
                <h2 className="xb-item--title">{service.title}</h2>
                <div className={`xb-item--dot ${service.bgClass || ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <Link
                  href="/service-single"
                  className="xb-overlay"
                  aria-label={`Read more about ${service.title}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
          <div className="xb-btn mt-70 text-center wow fadeInUp" data-wow-duration="600ms">
            <Link href="/service" className="thm-btn thm-btn--devops">
              View More Services
            </Link>
          </div>
        </Fade>
      </div>

      {/* Decorative Shapes */}
      <div className="cd-sec-shape">
        <div className="shape shape--one">
          <Image src={simg} alt="decorative shape" />
        </div>
        <div className="shape shape--four">
          <Image src={simg2} alt="decorative shape" />
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
