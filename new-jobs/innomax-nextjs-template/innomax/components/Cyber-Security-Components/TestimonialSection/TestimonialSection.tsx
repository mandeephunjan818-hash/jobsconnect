"use client";

import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import 'swiper/css';
import 'swiper/css/pagination';
import { Fade } from "react-awesome-reveal";
import icon from '../../../public/images/icon/like-tag.svg';
import brand1 from '../../../public/images/brand/brd-logo01.png';
import brand2 from '../../../public/images/brand/brd-logo02.png';
import brand3 from '../../../public/images/brand/brd-logo03.png';
import brand4 from '../../../public/images/brand/brd-logo04.png';
import brand5 from '../../../public/images/brand/brd-logo05.png';

import shape1 from '../../../public/images/shape/linea-bg-shape.png';
import shape2 from '../../../public/images/shape/world.png';
import shape3 from '../../../public/images/shape/linear-shape.png';
import Image, { StaticImageData } from "next/image";
import CustomerStories from "./customerStories";

interface CustomerStory {
  left: {
    img: StaticImageData;
    subTitle: string;
    logo: StaticImageData;
    title: string;
  };
  right: {
    content: string;
    author: {
      name: string;
      designation: string;
    };
    stats: {
      number: string | number;
      text: string;
    }[];
  };
}

interface TestimonialSectionProps {
  // You can add props if needed here
}

const TestimonialSection: React.FC<TestimonialSectionProps> = () => {

  const sliderRef = useRef<Slider | null>(null);
  const navSliderRef = useRef<Slider | null>(null);

  const mainSliderSettings = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: false,
    adaptiveHeight: true,
    responsive: [
      {
        breakpoint: 1025,
        settings: {
          centerPadding: "150px",
        },
      },
      {
        breakpoint: 640,
        settings: {
          centerPadding: "100px",
        },
      },
      {
        breakpoint: 420,
        settings: {
          centerPadding: "20px",
        },
      },
    ],
    afterChange: (currentSlide: number) => {
      navSliderRef.current?.slickGoTo(currentSlide);
    },
  };

  const navSliderSettings = {
    slidesToShow: 4,
    slidesToScroll: 4,
    dots: false,
    arrows: false,
    focusOnSelect: true,
    infinite: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
        },
      },
      {
        breakpoint: 420,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
        },
      },
    ],
    beforeChange: (_current: number, next: number) => {
      const slides = document.querySelectorAll(".cs-testimonial-slider-nav .slick-slide");
      slides.forEach((slide) => slide.classList.remove("is-active"));
      slides[next]?.classList.add("is-active");
    },
  };

  const handleNavClick = (index: number) => {
    sliderRef.current?.slickGoTo(index);
  };

  return (
    <section className="testimonial pt-160 pos-rel z-1">
      <div className="container">
        <div className="cs-tes_wrap">
          <div className="sec-title--two sec-title--three text-center mb-175">
            <Fade direction='down' triggerOnce={true} duration={1000} delay={9}>
              <div>
                <span className="sub-title wow fadeInDown" data-wow-duration="600ms">
                  <Image src={icon} alt="" /><span>Customer stories</span>
                </span>
              </div>
            </Fade>
            <Fade direction='up' triggerOnce={true} duration={1200} delay={9}>
              <div>
                <h2 className="title wow fadeInDown" data-wow-duration="600ms">Our amazing customers.</h2>
              </div>
            </Fade>
          </div>
          <div className="cs-tes-content">
            <Slider ref={sliderRef} {...mainSliderSettings} className="cs-testimonial-slider">
              {CustomerStories.map((story: CustomerStory, index: number) => (
                <div className="cs-tes-item" key={index}>
                  <div className="xb-left-item">
                    <div className="xb-item--img">
                      <Image src={story.left.img} alt="" />
                    </div>
                    <div className="xb-item--header">
                      <span className="xb-item--sub-title">{story.left.subTitle}</span>
                      <div className="xb-item--logo">
                        <Image src={story.left.logo} alt="" />
                      </div>
                      <h2 className="xb-item--title">{story.left.title}</h2>
                    </div>
                  </div>
                  <div className="xb-right-item">
                    <p className="xb-item--content">{story.right.content}</p>
                    <div className="xb-item--author">
                      <span className="xb-item--name">{story.right.author.name}</span>
                      <span className="xb-item--desig">{story.right.author.designation}</span>
                    </div>
                    <div className="xb-item--holder ul_li">
                      {story.right.stats.map((stat, statIndex) => (
                        <div className="xb-item--time" key={statIndex}>
                          <span className="xb-item--number">{stat.number}</span>
                          <span className="xb-item--text">{stat.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
          <div className="cs-bran-nav">
            <div className="barnd-logo cs-brand-logo">
              <Slider
                ref={navSliderRef}
                {...navSliderSettings}
                className="cs-testimonial-slider-nav"
              >
                {[brand1, brand2, brand5, brand3, brand4, brand1].map((brand, i) => (
                  <div className="brand-items" key={i} onClick={() => handleNavClick(i)}>
                    <div className="xb-img">
                      <Image src={brand} alt="" />
                    </div>
                    <div className="xb-line"></div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </div>
      </div>
      <div className="cs-tes-shape">
        <div className="shape shape--one"><Image src={shape1} alt="" /></div>
        <div className="shape shape--two"><Image className="world" src={shape2} alt="" /></div>
        <div className="shape shape--three"><Image src={shape3} alt="" /></div>
      </div>
    </section>
  );
};

export default TestimonialSection;
