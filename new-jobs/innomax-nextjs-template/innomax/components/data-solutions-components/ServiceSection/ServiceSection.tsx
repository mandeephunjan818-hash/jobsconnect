'use client';

import React, { useState } from 'react';
import Link from "next/link";
import Image, { StaticImageData } from 'next/image';

import sIconDefault from '../../../public/images/icon/flower-icon-blue.svg';
import Services from '../../../api/service'; // your Services array

interface ServiceItem {
  sIcon?: StaticImageData;
  Id: string;
  title: string;
  slug: string;
  sImg?: StaticImageData;
  thumb1?: string;
  thumb2?: string;
  description?: string;
  features?: string[];
  bgClass?: string;
}

const ServiceSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(2);

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index);
  };

  // Slice the services and provide default values for required fields
  const servicesToShow: ServiceItem[] = Services.slice(10, 14).map(service => ({
    ...service,
    sIcon: service.sIcon || sIconDefault,
    description: service.description || '',
  }));

  return (
    <section
      className="service pb-150 bg_img"
      style={{ backgroundImage: `url(/images/bg/da-service_bg.jpg)` }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="da-sec-titlte text-center mb-30">
              <span className="sub_title">
                <span>
                  <Image src={sIconDefault} alt="Section Icon" />
                </span>
                Our Services
              </span>
              <h2 className="title">
                AI and data analytics services to help you become greater
              </h2>
              <p className="content">
                Turn your disparate data into a major asset – and realise the true potential of your business.
              </p>
            </div>
          </div>
        </div>

        <div className="da-service-wrapper">
          {servicesToShow.map((service, index) => (
            <div
              key={index}
              className={`da-service-item xb-mouseenter ${activeIndex === index ? 'active' : ''}`}
              data-wow-delay={`${index * 150}ms`}
              data-wow-duration="600ms"
              onMouseEnter={() => handleMouseEnter(index)}
            >
              <div className="xb-item--holder">
                <div className="xb-item--icon">
                  <Image src={service.sIcon!} alt={service.title} />
                </div>
                <h3 className="xb-item--title">{service.title}</h3>
                <span className="xb-item--arrow">
                  <i className="fal fa-long-arrow-right"></i>
                </span>
                <p className="xb-item--content">{service.description}</p>
              </div>
              <Link
                href={'/service-single'}
                className="xb-overlay"
              />
            </div>
          ))}
        </div>

        <div className="xb-btn text-center mt-55">
          <Link href="/service" className="thm-btn thm-btn--fill_icon thm-btn--data">
            <div className="xb-item--hidden">
              <span className="xb-item--hidden-text">Book a Discover Call</span>
            </div>
            <div className="xb-item--holder">
              <span className="xb-item--text xb-item--text1">Book a Discover Call</span>
              <div className="xb-item--icon">
                <i className="fal fa-plus"></i>
              </div>
              <span className="xb-item--text xb-item--text2">Book a Discover Call</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
