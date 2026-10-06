'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';
import Services from '../../../api/service';

interface Service {
  title: string;
  slug: string;
  sIcon: StaticImageData;
  sImg: StaticImageData;
}

const ServiceSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0); 

  const activeBgRef = useRef<HTMLDivElement | null>(null);
  const serviceListRef = useRef<HTMLDivElement | null>(null);

  const updateActiveBg = (index: number) => {
    if (!serviceListRef.current || !activeBgRef.current) return;

    const items = serviceListRef.current.querySelectorAll<HTMLDivElement>('.service-list-item');
    const item = items[index];
    if (!item) return;

    const listTop = serviceListRef.current.getBoundingClientRect().top;
    const itemTop = item.getBoundingClientRect().top;
    const topOffset = itemTop - listTop;
    const height = item.offsetHeight;

    activeBgRef.current.style.top = `${topOffset}px`;
    activeBgRef.current.style.height = `${height}px`;
  };

  useEffect(() => {
    updateActiveBg(activeIndex);
    const handleResize = () => updateActiveBg(activeIndex);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex]);

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index);
  };

  const handleClick = (index: number) => {
    setActiveIndex(index);
  };

  const servicesToShow = Services.slice(6, 10) as Service[];

  return (
    <section className="services z-1 service-height pos-rel">
      <div className="service-images">
        {servicesToShow.map((service, index) => (
          <div
            key={index}
            className={`service-image-item ${activeIndex === index ? 'active' : ''}`}
            style={{ backgroundImage: `url(${service.sImg.src})` }}
          />
        ))}
      </div>

      <div className="service-content-box ul_li pos-rel">
        <div className="service-content-list">
          <h3 className="title">Core expertise</h3>
          <div
            className="service-list"
            ref={serviceListRef}
          >
            {servicesToShow.map((service, index) => (
              <div
                key={index}
                className={`service-list-item ul_li_between ${activeIndex === index ? 'current' : ''}`}
                onClick={() => handleClick(index)}
                onMouseEnter={() => handleMouseEnter(index)}
              >
                <div className="xb-item--icon">
                  <Image src={service.sIcon} alt={service.title} />
                </div>
                <h3 className="xb-item--title">{service.title}</h3>
                <Link
                  href={`/service-single/${service.slug}`}
                  className="xb-item--arrow"
                  aria-label={`Read more about ${service.title}`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 1C12 0.447714 11.5523 -7.61451e-07 11 -3.39982e-07L2 -2.13542e-07C1.44772 -5.50717e-07 1 0.447715 1 0.999999C1 1.55228 1.44772 2 2 2L10 2L10 10C10 10.5523 10.4477 11 11 11C11.5523 11 12 10.5523 12 10L12 1ZM1.70711 11.7071L11.7071 1.70711L10.2929 0.292893L0.292893 10.2929L1.70711 11.7071Z"
                      fill="#111112"
                    />
                  </svg>
                </Link>
              </div>
            ))}
            <div className="active-bg" ref={activeBgRef} />
          </div>
        </div>

        <div className="service-content-image">
          {servicesToShow.map((service, index) => (
            <div
              key={index}
              className={`xb-item--img ${activeIndex === index ? 'active' : ''}`}
              style={{ backgroundImage: `url(${service.sImg.src})` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
