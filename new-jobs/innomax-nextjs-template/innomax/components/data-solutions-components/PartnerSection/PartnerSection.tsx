'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import pimg1 from '../../../public/images/brand/da-brand01.png';
import pimg2 from '../../../public/images/brand/da-brand02.png';
import pimg3 from '../../../public/images/brand/da-brand03.png';
import pimg4 from '../../../public/images/brand/da-brand04.png';
import pimg5 from '../../../public/images/brand/da-brand05.png';
import pimg6 from '../../../public/images/brand/da-brand01.png';

const partners = [
  { img: pimg1 },
  { img: pimg2 },
  { img: pimg3 },
  { img: pimg4 },
  { img: pimg5 },
  { img: pimg6 },
];

const PartnerSection: React.FC = () => {
  const marqueeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const marqueeContent = marquee.querySelector<HTMLDivElement>('.da-brand_marquee');
    if (!marqueeContent) return;

    const speed = 0.5;
    let offset = 0;

    // Duplicate content for infinite scroll
    marqueeContent.innerHTML += marqueeContent.innerHTML;

    const animate = () => {
      offset -= speed;
      marqueeContent.style.transform = `translateX(${offset}px)`;

      const scrollWidth = marqueeContent.scrollWidth / 2;
      if (Math.abs(offset) >= scrollWidth) {
        offset = 0;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <section className="brand pt-145 pb-140 o-hidden" style={{ backgroundColor: '#f4f5fc' }}>
      <div className="container">
        <div className="da-brand_wrapper">
          <h2 className="xb-item--title">
            More than <span>25,000</span> brands trust Innomax
          </h2>

          <div
            className="da-brand_inner"
            ref={marqueeRef}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="da-brand_marquee"
              style={{ display: 'flex', whiteSpace: 'nowrap' }}
            >
              {partners.map((partner, index) => (
                <div
                  className="xb-item--item"
                  key={index}
                  style={{ margin: '0 20px', flexShrink: 0 }}
                >
                  <div className="xb-item--logo">
                    <Image src={partner.img} alt={`Partner ${index + 1}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="xb-item--content mt-40">
            Got a question? Need more information? Our expert team is here to help.
          </p>

          <div className="xb-btn mt-25">
            <Link
              href="/contact"
              className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data_blue"
            >
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
      </div>
    </section>
  );
};

export default PartnerSection;
