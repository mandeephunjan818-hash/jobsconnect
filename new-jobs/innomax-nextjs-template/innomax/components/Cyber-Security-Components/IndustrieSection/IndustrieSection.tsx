"use client";

import React from 'react';
import { Fade } from "react-awesome-reveal";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from 'swiper/modules';
import "swiper/swiper-bundle.css";
import Image, { StaticImageData } from 'next/image';

import hicon from '../../../public/images/icon/magic02.svg';
import sIcon1 from '../../../public/images/icon/ftd_01.svg';
import sIcon2 from '../../../public/images/icon/ftd_02.svg';
import sIcon3 from '../../../public/images/icon/ftd_03.svg';
import sIcon4 from '../../../public/images/icon/ftd_04.svg';
import sIcon5 from '../../../public/images/icon/ftd_05.svg';
import sIcon6 from '../../../public/images/icon/ftd_06.svg';
import sIcon7 from '../../../public/images/icon/ftd_07.svg';
import sIcon8 from '../../../public/images/icon/ftd_08.svg';
import sIcon9 from '../../../public/images/icon/ftd_09.svg';
import sIcon10 from '../../../public/images/icon/ftd_10.svg';

import hIcon1 from '../../../public/images/icon/ft_01.svg';
import hIcon2 from '../../../public/images/icon/ft_02.svg';
import hIcon3 from '../../../public/images/icon/ft_03.svg';
import hIcon4 from '../../../public/images/icon/ft_04.svg';
import hIcon5 from '../../../public/images/icon/ft_05.svg';
import hIcon6 from '../../../public/images/icon/ft_06.svg';
import hIcon7 from '../../../public/images/icon/ft_07.svg';
import hIcon8 from '../../../public/images/icon/ft_08.svg';
import hIcon9 from '../../../public/images/icon/ft_09.svg';
import hIcon10 from '../../../public/images/icon/ft_10.svg';

interface Industry {
  icon: StaticImageData;
  hicon: StaticImageData;
  title: string;
}

const industriesBase: Industry[] = [
  { icon: sIcon1, hicon: hIcon1, title: 'Finance' },
  { icon: sIcon2, hicon: hIcon2, title: 'Healthcare' },
  { icon: sIcon3, hicon: hIcon3, title: 'Government' },
  { icon: sIcon4, hicon: hIcon4, title: 'E-commerce' },
  { icon: sIcon5, hicon: hIcon5, title: 'Energy' },
  { icon: sIcon6, hicon: hIcon6, title: 'Education' },
  { icon: sIcon7, hicon: hIcon7, title: 'Manufacturing' },
  { icon: sIcon8, hicon: hIcon8, title: 'Crypto' },
  { icon: sIcon9, hicon: hIcon9, title: 'Logistics' },
  { icon: sIcon10, hicon: hIcon10, title: 'Technology' },
];

// Duplicate for loop effect if needed
const Industrie: Industry[] = [...industriesBase, ...industriesBase];

const IndustrieSection: React.FC = () => {
  return (
    <section className="industries pt-120 overflow-hidden">
      <div className="container">
        <div className="sec-title--two sec-title--three text-center mb-60">
          <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
            <div>
              <span className="sub-title wow fadeInDown" data-wow-duration="600ms">
                <Image src={hicon} alt="Magic Icon" />
                <span>Industries we work</span>
              </span>
            </div>
          </Fade>
          <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
            <div>
              <h2 className="title wow fadeInDown" data-wow-duration="600ms">
                Serving diverse industries
              </h2>
            </div>
          </Fade>
        </div>
      </div>

      <div className="industries-slider">
        <Swiper
          className="industries-slider"
          loop={true}
          spaceBetween={40}
          speed={400}
          slidesPerView={8}
          centeredSlides={true}
          autoplay={{
            delay: 6000,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
          }}
          breakpoints={{
            1600: { slidesPerView: 8 },
            768: { slidesPerView: 4 },
            576: { slidesPerView: 4 },
            0: { slidesPerView: 2, spaceBetween: 20, centeredSlides: false },
          }}
          modules={[Pagination, Autoplay]}
        >
          {Industrie.map((industry, i) => (
            <SwiperSlide key={i}>
              <div className="cs-industries-item">
                <div className="xb-item--inner">
                  <div className="xb-item--icon">
                    <Image
                      className="default"
                      src={industry.icon}
                      alt={`${industry.title} icon`}
                    />
                    <Image
                      className="hover"
                      src={industry.hicon}
                      alt={`${industry.title} icon hover`}
                    />
                  </div>
                  <h3 className="xb-item--title">{industry.title}</h3>
                </div>

                <div className="bg-shape1">
                  {/* SVG shape here */}
                </div>

                <div className="bg-shape2">
                  {/* SVG shape here */}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="xb-btn text-center mt-60">
        <Link href="/contact" className="blc-btn">
          <span>
            Get started now <i className="far fa-angle-right"></i>
          </span>
          <span className="btn-shape">
            <svg
              width="362"
              height="78"
              viewBox="0 0 362 78"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0.5 22.7183L25.5093 1.39453H337.972L361.5 22.7092V56.5515L337.98 76.6051H25.5093L0.5 55.2813V22.7183Z"
                fill="url(#paint0_linear_1600_996691467)"
                stroke="#23263C"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_1600_996691467"
                  x1="1.29285"
                  y1="38.9973"
                  x2="362"
                  y2="33.9973"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#431DAB" />
                  <stop offset="1" stopColor="#AE6DFE" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="btn-shape2">
            <svg
              width="271"
              height="60"
              viewBox="0 0 271 60"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0.5 17.2308L20.1225 0.5H252.042L270.5 17.2217V43.7692L252.05 59.5H20.1225L0.5 42.7692V17.2308Z"
                fill="#010315"
                stroke="url(#paint0_linear_1742_6611589)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_1742_6611589"
                  x1="271"
                  y1="61.5556"
                  x2="232.791"
                  y2="-3.08978"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#6780D2" />
                  <stop offset="1" stopColor="#2F3B8D" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
};

export default IndustrieSection;
