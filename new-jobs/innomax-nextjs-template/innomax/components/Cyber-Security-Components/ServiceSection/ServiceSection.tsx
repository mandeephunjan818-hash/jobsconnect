"use client";

import React from "react";
import { Fade } from "react-awesome-reveal";
import Services from "../../../api/service";
import Link from "next/link";
import Image, { StaticImageData } from "next/image";

import sIcon from "../../../public/images/icon/ser_layer.svg";
import spIcon from "../../../public/images/icon/plus.svg";
import shape from "../../../public/images/shape/service01.png";

// Define types for your service object based on your Services data structure
interface Service {
  sIcon?: StaticImageData;
  title: string;
  features?: string[];
  slug: string;
}

const ServiceSection: React.FC = () => {
  return (
    <section className="service pt-170 pb-100">
      <div className="container">
        <div className="cd-service_wrap pos-rel">
          <div className="sec-title--two sec-title--three text-center mb-30">
            <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
              <div>
                <span className="sub-title wow fadeInDown" data-wow-duration="600ms">
                  <Image src={sIcon} alt="" />
                  <span>Services</span>
                </span>
              </div>
            </Fade>
            <Fade direction="down" triggerOnce={false} duration={1200} delay={9}>
              <div>
                <h2 className="title wow fadeInDown" data-wow-duration="600ms">
                  Our recent SEO work
                </h2>
              </div>
            </Fade>
          </div>

          <div className="row">
            {/* First column: slice 14-16 */}
            <div className="col-lg-4">
              {Services.slice(14, 16).map((service: Service, index: number) => (
                <div className="cs-service-item mt-30" key={index}>
                  <div className="xb-item--inner">
                    <div className="xb-item--icon">
                      {service.sIcon && <Image src={service.sIcon} alt={service.title} />}
                    </div>
                    <h3 className="xb-item--title">{service.title}</h3>
                    <ul className="xb-item--item list-unstyled">
                      {service.features?.map((feature, i) => (
                        <li key={i}>
                          <Image src={spIcon} alt="plus icon" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-bg1">{/* SVG */}</div>
                  <div className="border-bg2">{/* SVG */}</div>
                  <Link
                    href="/service-single"
                    className="xb-overlay xb-overlay-link"
                    aria-label={`View details about ${service.title}`}
                  />
                </div>
              ))}
            </div>

            {/* Second column: slice 16-17 */}
            <div className="col-lg-4">
              {Services.slice(16, 17).map((service: Service, index: number) => (
                <div className="cs-service-item mt-30" key={index}>
                  <div className="xb-item--inner">
                    <div className="xb-item--icon">
                      {service.sIcon && <Image src={service.sIcon} alt={service.title} />}
                    </div>
                    <h3 className="xb-item--title">{service.title}</h3>
                    <ul className="xb-item--item list-unstyled">
                      {service.features?.map((feature, i) => (
                        <li key={i}>
                          <Image src={spIcon} alt="plus icon" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-bg1">{/* SVG */}</div>
                  <div className="border-bg2">{/* SVG */}</div>
                  <Link
                    href="/service-single"
                    className="xb-overlay xb-overlay-link"
                    aria-label={`View details about ${service.title}`}
                  />
                </div>
              ))}
            </div>

            {/* Third column: slice 17-19 */}
            <div className="col-lg-4">
              {Services.slice(17, 19).map((service: Service, index: number) => (
                <div className="cs-service-item mt-30" key={index}>
                  <div className="xb-item--inner">
                    <div className="xb-item--icon">
                      {service.sIcon && <Image src={service.sIcon} alt={service.title} />}
                    </div>
                    <h3 className="xb-item--title">{service.title}</h3>
                    <ul className="xb-item--item list-unstyled">
                      {service.features?.map((feature, i) => (
                        <li key={i}>
                          <Image src={spIcon} alt="plus icon" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-bg1">{/* SVG */}</div>
                  <div className="border-bg2">{/* SVG */}</div>
                  <Link
                    href="/service-single"
                    className="xb-overlay xb-overlay-link"
                    aria-label={`View details about ${service.title}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="cs-ser_shape">
            <Image src={shape} alt="Decorative shape" />
          </div>
        </div>

        <div className="xb-btn z-2 pos-rel text-center mt-55 wow fadeInUp" data-wow-duration="600ms">
          <Link href="/service" className="blc-btn" aria-label="Get started now with our services">
            <span>
              Get started now <i className="far fa-angle-right" />
            </span>
            <span className="btn-shape">{/* SVG */}</span>
            <span className="btn-shape2">{/* SVG */}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
