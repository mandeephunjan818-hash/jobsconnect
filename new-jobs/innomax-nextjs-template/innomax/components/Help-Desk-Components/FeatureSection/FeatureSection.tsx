'use client';

import React, { useState } from "react";
import { Fade } from "react-awesome-reveal";
import icon from '../../../public/images/icon/magic-black.svg'
import icon1 from '../../../public/images/feature/img02.png'
import icon2 from '../../../public/images/feature/img01.png'
import Image from "next/image";

const FeatureSection = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(0);

    const toggleAccordion = (index: number) => {
        setActiveIndex(index === activeIndex ? null : index);
    };

    const accordionData = [
        {
            title: "Improve time to value",
            content:
                "Self-service and automation deflect 15% of agent contacts. Agents resolve remaining tickets faster with rich customer insights for better efficiency and service.",
        },
        {
            title: "Reduce effort per ticket",
            content:
                "Self-service and automation deflect 15% of agent contacts. Agents resolve remaining tickets faster with rich customer insights for better efficiency and service.",
        },
        {
            title: "Keep costs low",
            content:
                "Self-service and automation deflect 15% of agent contacts. Agents resolve remaining tickets faster with rich customer insights for better efficiency and service.",
        },
        {
            title: "Boost Customer Satisfaction",
            content:
                "Self-service and automation deflect 15% of agent contacts. Agents resolve remaining tickets faster with rich customer insights for better efficiency and service.",
        },
    ];

    return (
        <section className="feature pb-100 pt-100">
            <div className="container">
                <div className="feature-wrap">
                    <div className="row align-items-center mt-none-30">
                        <div className="col-lg-6 mt-30">
                            <div className="feature-left-item pos-rel">
                                <div className="xb-img"><Image src={icon1} alt="Feature image 1" /></div>
                                <div className="xb-img-two"><Image className="updown-2" src={icon2} alt="Feature image 2" /></div>
                            </div>
                        </div>
                        <div className="col-lg-6 mt-30">
                            <div className="feature-right-item mt-30">
                                <div className="sec-title--two sec-title--four mb-40">
                                    <Fade direction='down' triggerOnce={false} duration={1000} delay={9}>
                                        <div>
                                            <div className="sub-title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                                                <Image src={icon} alt="Magic icon" />Impressive feature
                                            </div>
                                        </div>
                                    </Fade>
                                    <Fade direction='down' triggerOnce={false} duration={1500} delay={9}>
                                        <div>
                                            <h2 className="title mb-15 wow skewIn" data-wow-duration="600ms">Maximize your ROI</h2>
                                        </div>
                                    </Fade>
                                    <p>Save time and money with Innomax. According to Forrester&apos;s our Total Economic Impact™ (TEI) study, customers saw a 286% ROI over three years.</p>
                                </div>
                                <div className="xb-faq xb-faq-two">
                                    <ul className="accordion_box clearfix list-unstyled">
                                        {accordionData.map((item, index) => (
                                            <li
                                                className={`accordion block ${activeIndex === index ? "active-block" : ""}`}
                                                key={index}
                                            >
                                                <div
                                                    className={`acc-btn ${activeIndex === index ? "active" : ""}`}
                                                    onClick={() => toggleAccordion(index)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") toggleAccordion(index);
                                                    }}
                                                    aria-expanded={activeIndex === index}
                                                    aria-controls={`accordion-content-${index}`}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {item.title}
                                                    <span className="arrow"></span>
                                                </div>
                                                <div
                                                    id={`accordion-content-${index}`}
                                                    className={`acc_body ${activeIndex === index ? "current" : ""}`}
                                                    style={{ display: activeIndex === index ? "block" : "none" }}
                                                    role="region"
                                                    aria-labelledby={`accordion-header-${index}`}
                                                >
                                                    <div className="content">
                                                        <p>{item.content}</p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default FeatureSection;
