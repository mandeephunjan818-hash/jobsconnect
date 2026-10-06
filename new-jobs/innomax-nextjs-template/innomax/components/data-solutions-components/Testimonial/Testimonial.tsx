'use client';

import React, { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from 'swiper/modules';
import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import ticon1 from "../../../public/images/icon/flower-icon-blue.svg";
import tImg1 from "../../../public/images/testimonial/da-tes-img.png";
import tImg2 from "../../../public/images/testimonial/ixico-logo.png";
import type { Swiper as SwiperType } from 'swiper';

const Testimonial: React.FC = () => {
  const prevRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && prevRef.current && nextRef.current) {
      if (!swiper.params.navigation || typeof swiper.params.navigation === 'boolean') {
        swiper.params.navigation = { prevEl: prevRef.current, nextEl: nextRef.current };
      } else {
        swiper.params.navigation.prevEl = prevRef.current;
        swiper.params.navigation.nextEl = nextRef.current;
      }

      swiper.navigation.init();
      swiper.navigation.update();
    }
  }, []);

  return (
    <section className="testimonial pt-150 pb-140">
      <div className="container">
        <div className="da-sec-titlte text-center mb-60">
          <span className="sub_title">
            <span><Image src={ticon1} alt="Flower Icon" /></span>
            Case studies
          </span>
          <h2 className="title">Who We've helped</h2>
        </div>

        <div className="da-testimonial-wrap pos-rel">
          <div className="da-testimonial-slider swiper-container">
            <Swiper
              modules={[Navigation]}
              spaceBetween={50}
              slidesPerView={1}
              loop
              speed={1800}
              parallax
              onBeforeInit={(swiper) => {
                swiperRef.current = swiper;
              }}
            >
              {[1, 2].map((_, index) => (
                <SwiperSlide className="da-testimonial" key={index}>
                  <div className="row align-items-center mt-none-30">
                    <div className="col-lg-6 mt-30">
                      <div className="da-tes-left">
                        <h2 className="xb-item--title">
                          Transforming a leading medical imaging service provider with Microsoft Cloud
                        </h2>
                        <p className="xb-item--content content--one">
                          With the ambition to scale and further develop its AI-imaging biomarker service offering to the global clinical trial market, IXICO came to us for a secure and seamless cloud transformation.
                        </p>
                        <div className="xb-item--holder ul_li align-items-start">
                          <div className="xb-item--meta">
                            <h3 className="xb-item--number">$3 Million</h3>
                            <span className="xb-item--text">
                              Annual cost savings achieved through optimized trial operations.
                            </span>
                          </div>
                          <div className="xb-item--meta">
                            <h3 className="xb-item--number">200+ Clinical Trials</h3>
                            <span className="xb-item--text">
                              Supported globally with IXICO's AI-enhanced imaging biomarkers.
                            </span>
                          </div>
                        </div>
                        <p className="xb-item--content content--two">
                          IXICO is a premium, specialist neuroimaging services provider to the global biopharmaceutical industry.
                        </p>
                        <p className="xb-item--content content--three">
                          The company develops and deploys therapeutic-specific AI (Artificial Intelligence) algorithms designed to reduce clinical trial size and costs whilst simultaneously improving insights to increase the likelihood of approval in neurological clinical trials.
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-6 mt-30">
                      <div className="da-tes-right">
                        <div className="xb-item--author">
                          <Image src={tImg1} alt="IXICO Trial Image" />
                        </div>
                        <div className="xb-item--avatar">
                          <Image src={tImg2} alt="IXICO Logo" />
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Navigation Buttons */}
          <div className="da-swiper-btn swiper-button-prev" ref={prevRef}>
            <i className="fal fa-long-arrow-left"></i>
          </div>
          <div className="da-swiper-btn swiper-button-next" ref={nextRef}>
            <i className="fal fa-long-arrow-right"></i>
          </div>
        </div>

        <div className="xb-btn text-center mt-55">
          <Link href="/contact" className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data-strock">
            <div className="xb-item--hidden">
              <span className="xb-item--hidden-text">View More Case Studies</span>
            </div>
            <div className="xb-item--holder">
              <span className="xb-item--text xb-item--text1">View More Case Studies</span>
              <div className="xb-item--icon"><i className="fal fa-plus"></i></div>
              <span className="xb-item--text xb-item--text2">View More Case Studies</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
