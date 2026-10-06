"use client";

import React, { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import type { NavigationOptions } from "swiper/types";
import { Fade } from "react-awesome-reveal";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import ticon1 from "../../../public/images/testimonial/rating-star.png";
import ticon2 from "../../../public/images/testimonial/rating-star.png";
import icon1 from "../../../public/images/icon/tes-icon.png";
import icon2 from "../../../public/images/icon/tes-icon02.png";
import icon3 from "../../../public/images/icon/tes-icon03.png";
import tImg1 from "../../../public/images/testimonial/tes-img01.png";
import tImg2 from "../../../public/images/testimonial/tes-img02.png";
import tImg3 from "../../../public/images/testimonial/tes-img03.png";
import Image, { StaticImageData } from "next/image";

interface TestimonialItem {
  id: string;
  tImg: StaticImageData;
  tIcon: StaticImageData;
  Title: string;
  Des: string;
  Name: string;
  sub: string;
  country: string;
}

const testimonial: TestimonialItem[] = [
  {
    id: "01",
    tImg: tImg1,
    tIcon: icon1,
    Title: "Amazing software services",
    Des: "The solutions they're providing is helping our business run more smoothly. We&apos;ve been able to make quick developments with them, meeting our product vision within the timeline we set up. Listen to them because they can give strong advice about how to build good products.",
    Name: "Maverick Phoenix",
    sub: "Board Member, UNIQA",
    country: "Seattle, Ukraine",
  },
  {
    id: "02",
    tImg: tImg2,
    tIcon: icon2,
    Title: "Amazing software services",
    Des: "The solutions they're providing is helping our business run more smoothly. We&apos;ve been able to make quick developments with them, meeting our product vision within the timeline we set up. Listen to them because they can give strong advice about how to build good products.",
    Name: "Maverick Phoenix",
    sub: "Board Member, UNIQA",
    country: "Seattle, Ukraine",
  },
  {
    id: "03",
    tImg: tImg3,
    tIcon: icon3,
    Title: "Amazing software services",
    Des: "The solutions they're providing is helping our business run more smoothly. We&apos;ve been able to make quick developments with them, meeting our product vision within the timeline we set up. Listen to them because they can give strong advice about how to build good products.",
    Name: "Maverick Phoenix",
    sub: "Board Member, UNIQA",
    country: "Seattle, Ukraine",
  },
  {
    id: "04",
    tImg: tImg2,
    tIcon: icon2,
    Title: "Amazing software services",
    Des: "The solutions they're providing is helping our business run more smoothly. We&apos;ve been able to make quick developments with them, meeting our product vision within the timeline we set up. Listen to them because they can give strong advice about how to build good products.",
    Name: "Maverick Phoenix",
    sub: "Board Member, UNIQA",
    country: "Seattle, Ukraine",
  },
];

const Testimonial: React.FC = () => {
  const [prevEl, setPrevEl] = useState<HTMLDivElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLDivElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || !paginationRef.current) return;

    const updatePagination = () => {
      const current = swiper.realIndex + 1;
      const total = swiper.slides.length;

      const currentElem = paginationRef.current!.querySelector(
        ".swiper-pagination-current"
      );
      const totalElem = paginationRef.current!.querySelector(
        ".swiper-pagination-total"
      );

      if (currentElem && totalElem) {
        currentElem.textContent = current.toString();
        totalElem.textContent = total.toString();
      }
    };

    swiper.on("slideChange", updatePagination);
    updatePagination(); // initialize pagination

    return () => {
      swiper.off("slideChange", updatePagination);
    };
  }, []);

  return (
    <section
      className="testimonial o-hidden pos-rel pt-125 pb-200 bg_img"
      style={{
        backgroundImage: `url(${'/images/bg/tes-glassisom.jpg'})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="tes-heading text-center mb-60">
        <Fade direction="up" triggerOnce={false} duration={1000} delay={9}>
          <h2
            className="title wow fadeInDown"
            data-wow-delay="100ms"
            data-wow-duration="600ms"
          >
            Thousands of customers can&apos;t be wrong
          </h2>
        </Fade>
      </div>

      <div className="testimonial-slider pb-40">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={3}
          loop={true}
          speed={400}
          autoplay={{
            delay: 6000,
            disableOnInteraction: false,
          }}
          navigation={{
            prevEl,
            nextEl,
          }}
          pagination={{
            el: ".swiper-pagination",
            type: "fraction",
            clickable: true,
          }}
          breakpoints={{
            1600: { slidesPerView: 3 },
            768: { slidesPerView: 2 },
            576: { slidesPerView: 1 },
            0: { slidesPerView: 1 },
          }}
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
            // FIXED: Modified condition to securely check object typing configuration parameters
            if (swiper.params.navigation && typeof swiper.params.navigation !== "boolean") {
              const navigation = swiper.params.navigation as NavigationOptions;
              navigation.prevEl = prevEl;
              navigation.nextEl = nextEl;
            }
          }}
        >
          {testimonial.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="testimonial-item">
                <div className="xb-item--holder">
                  <div className="xb-item--author">
                    <div className="img img--one">
                      <Image src={item.tIcon} alt={`${item.Name} icon`} />
                    </div>
                    <div className="img img--two">
                      <Image src={item.tImg} alt={`${item.Name} photo`} />
                    </div>
                    <div className="xb-item--avatar mt-20">
                      <h3 className="xb-item--name">{item.Name}</h3>
                      <span className="xb-item--desig">{item.sub}</span>
                    </div>
                  </div>
                  <p className="xb-item--content">{item.Des}</p>
                </div>
                <div className="xb-item--bottom ul_li_between">
                  <div className="xb-item--rating">
                    <span>
                      <Image src={ticon1} alt="Rating star" /> 5.0
                    </span>
                  </div>
                  <span className="xb-item--quat">
                    <Image src={ticon2} alt="Quote icon" />
                  </span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="testimonial-pagination" ref={paginationRef}>
          <div className="swiper-buttons swiper-button-next" ref={setNextEl}>
            <i className="far fa-angle-right"></i>
          </div>
          <div className="swiper-buttons swiper-button-prev" ref={setPrevEl}>
            <i className="far fa-angle-left"></i>
          </div>
          <div className="swiper-pagination swiper-pagination-fraction">
            <span className="swiper-pagination-current">1</span> /{" "}
            <span className="swiper-pagination-total">
              {testimonial.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
