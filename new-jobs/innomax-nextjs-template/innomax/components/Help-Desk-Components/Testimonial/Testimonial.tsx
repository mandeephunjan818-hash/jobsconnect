'use client';

import React from "react";
import { Fade } from "react-awesome-reveal";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from 'swiper/modules';
import "swiper/css";
import "swiper/css/pagination";

import icon1 from "../../../public/images/icon/like-icon02.svg";
import icon2 from "../../../public/images/testimonial/rating-star02.png";
import tImg1 from "../../../public/images/testimonial/hd-tes01.png";
import tImg2 from "../../../public/images/testimonial/hd-tes02.png";
import tImg3 from "../../../public/images/testimonial/hd-tes03.png";
import clogo from "../../../public/images/shape/tes-shape.png";
import Image from "next/image";

const Testimonial = () => {
    const testimonials = [
        {
            authorImg: tImg1,
            content:
                "“Most businesses are sitting on a data gold mine within their customer profiles. We use innomax to get on customer interactions.”",
            name: "Laurie Leduc",
            designation: "Head of Community Support",
            rating: 5.0,
        },
        {
            authorImg: tImg2,
            content:
                "“The workflows we built in innomax suite allowed us to achieve or exceed customer expectations in handling urgent issues.”",
            name: "Gershwin Exeter",
            designation: "CEO of Global Services",
            rating: 5.0,
        },
        {
            authorImg: tImg3,
            content:
                "“We love innomax because their API allows us to explore ways to get customer data more personalized experience.”",
            name: "Sophia Turner",
            designation: "Founder at Fleet chaser",
            rating: 5.0,
        },
        {
            authorImg: tImg1,
            content:
                "“Most businesses are sitting on a data gold mine within their customer profiles. We use innomax to get on customer interactions.”",
            name: "Laurie Leduc",
            designation: "Head of Community Support",
            rating: 5.0,
        },
        {
            authorImg: tImg2,
            content:
                "“The workflows we built in innomax suite allowed us to achieve or exceed customer expectations in handling urgent issues.”",
            name: "Gershwin Exeter",
            designation: "CEO of Global Services",
            rating: 5.0,
        },
        {
            authorImg: tImg3,
            content:
                "“We love innomax because their API allows us to explore ways to get customer data more personalized experience.”",
            name: "Sophia Turner",
            designation: "Founder at Fleet chaser",
            rating: 5.0,
        },
    ];

    return (
        <section className="testimonial pt-130 pb-155" style={{ backgroundColor: "#fff" }}>
            <div className="container">
                <div className="sec-title--two sec-title--four text-center mb-60">
                    <Fade direction="down" triggerOnce={true} duration={1000} delay={900}>
                        <div>
                            <div className="sub-title">
                                <Image src={icon1} alt="like icon" /> Real feedback
                            </div>
                        </div>
                    </Fade>
                    <Fade direction="down" triggerOnce={true} duration={1500} delay={900}>
                        <div>
                            <h2 className="title">The customer experience</h2>
                        </div>
                    </Fade>
                </div>
            </div>
            <div className="hd-testimonial-slider-inner">
                <Swiper
                    modules={[Pagination, Autoplay]}
                    loop={true}
                    spaceBetween={30}
                    speed={400}
                    slidesPerView={3}
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
                        1600: { slidesPerView: 2 },
                        768: { slidesPerView: 2 },
                        576: { slidesPerView: 2 },
                        0: { slidesPerView: 1 },
                    }}
                    className="hd-testimonial-slider"
                >
                    {testimonials.map((testimonial, index) => (
                        <SwiperSlide key={index}>
                            <div className="testimonial-item hd-testimonial-item pos-rel">
                                <div className={`xb-item--inner tes-bg--${index + 1} ul_li`}>
                                    <div className="xb-item--author">
                                        <Image src={testimonial.authorImg} alt={testimonial.name} />
                                    </div>
                                    <div className="xb-item--holder">
                                        <p className="xb-item--content">{testimonial.content}</p>
                                        <div className="xb-item--box ul_li_between pt-100">
                                            <div className="xb-item--avatar">
                                                <h3 className="xb-item--name">{testimonial.name}</h3>
                                                <span className="xb-item--desig">{testimonial.designation}</span>
                                            </div>
                                            <div className="xb-item--rating">
                                                <span>
                                                    <Image src={icon2} alt="rating star icon" /> {testimonial.rating}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="xb-item--shape">
                                    <Image src={clogo} alt="testimonial shape" />
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
};

export default Testimonial;
