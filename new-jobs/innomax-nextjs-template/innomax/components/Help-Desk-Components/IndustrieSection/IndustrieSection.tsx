'use client';

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from 'swiper/modules';
import "swiper/swiper-bundle.css";
import Image, { StaticImageData } from 'next/image';

import hicon from '../../../public/images/icon/medal-star-black.svg';
import sIcon1 from '../../../public/images/award/hd-img01.png';
import sIcon2 from '../../../public/images/award/hd-img02.png';
import sIcon3 from '../../../public/images/award/hd-img03.png';
import sIcon4 from '../../../public/images/award/hd-img04.png';
import sIcon5 from '../../../public/images/award/hd-img05.png';
import sIcon6 from '../../../public/images/award/hd-img06.png';

interface Industry {
  icon: StaticImageData;
}

const Industrie: Industry[] = [
  { icon: sIcon1 },
  { icon: sIcon2 },
  { icon: sIcon3 },
  { icon: sIcon4 },
  { icon: sIcon5 },
  { icon: sIcon6 },
  { icon: sIcon1 },
  { icon: sIcon2 },
  { icon: sIcon3 },
  { icon: sIcon4 },
  { icon: sIcon5 },
  { icon: sIcon6 },
];

const IndustrieSection: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <section className="award pt-130 pb-120">
      <div className="sec-title--two sec-title--four text-center mb-25">
        <div className="sub-title">
          <Image src={hicon} alt="Our awards icon" />
          Our awards
        </div>
      </div>
      <div className="hd-award-slider">
        <Swiper
          className="hd-award-slider"
          loop={true}
          spaceBetween={40}
          speed={400}
          slidesPerView={9}
          centeredSlides={true}
          autoplay={{
            delay: 6000,
            disableOnInteraction: false,
          }}
          pagination={{
            el: ".swiper-pagination",
            clickable: true,
          }}
          breakpoints={{
            1600: { slidesPerView: 10 },
            768: { slidesPerView: 4 },
            576: { slidesPerView: 4 },
            0: { slidesPerView: 2, spaceBetween: 20, centeredSlides: false },
          }}
          modules={[Pagination, Autoplay]}
        >
          {Industrie.map((industry, i) => (
            <SwiperSlide key={i}>
              <div className="hd-award-item">
                <div className="xb-img">
                  <Image src={industry.icon} alt={`Award ${i + 1}`} />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default IndustrieSection;
