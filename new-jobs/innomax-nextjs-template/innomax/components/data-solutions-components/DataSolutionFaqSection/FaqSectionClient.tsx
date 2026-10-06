"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";
import hicon from "../../../public/images/icon/building.svg";

export interface FaqItem {
    number: string;
    question: string;
    answer: string;
}

interface Props {
    faqs: FaqItem[];
}

const FaqSectionClient: React.FC<Props> = ({ faqs }) => {
    const [activeFaq, setActiveFaq] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
        setActiveFaq((prev) => (prev === index ? null : index));
    };

    // Split into left and right columns (first half left, second half right)
    const half = Math.ceil(faqs.length / 2);
    const faqsLeft = faqs.slice(0, half);
    const faqsRight = faqs.slice(half);

    const renderFaqs = (list: FaqItem[], offset: number) =>
        list.map((faq, index) => {
            const currentIndex = index + offset;
            const isActive = activeFaq === currentIndex;

            return (
                // <Fade direction="up" triggerOnce={false} duration={1400} delay={9}>
                    <li
                        key={faq.number}
                        className={`accordion block ${isActive ? "active-block" : ""}`}
                    >
                        <div
                            className={`acc-btn ${isActive ? "active" : ""}`}
                            onClick={() => toggleFaq(currentIndex)}
                        >
                            <span className="number">{faq.number}</span>
                            {/* If your data contains HTML, use dangerouslySetInnerHTML */}
                            <span dangerouslySetInnerHTML={{ __html: faq.question }} />
                            <span className="arrow"></span>
                        </div>
                        <div
                            className="acc_body"
                            style={{
                                maxHeight: isActive ? "1000px" : "0",
                                overflow: "hidden",
                                transition: "max-height 0.3s ease",
                            }}
                        >
                            <div className="content">
                                <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
                            </div>
                        </div>
                    </li>
                // </Fade>
            );
        });

    return (
        <section
            className="faq pb-150 pt-150"
        // style={{ backgroundColor: "#f4f5fc" }}
        >
            <div className="container">
                <div className="sec-title--two text-center mb-30">
                    {/* <Fade direction="down" triggerOnce={false} duration={500} delay={3}> */}
                        <div>
                            <div className="sub-title wow fadeInDown tm-badge" data-wow-duration="600ms">
                                <Image src={hicon} alt="icon" /> FAQ
                            </div>
                        </div>
                    {/* </Fade> */}
                    {/* <Fade direction="up" triggerOnce={false} duration={600} delay={3}> */}
                        <div>
                            <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                                Your Questions, Answered!
                            </h2>
                        </div>
                    {/* </Fade> */}
                </div>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="da-left-faq">
                            <div className="xb-faq xb-faq-two da-faq">
                                <ul className="accordion_box clearfix list-unstyled">
                                    {renderFaqs(faqsLeft, 0)}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="da-right-faq">
                            <div className="xb-faq xb-faq-two da-faq">
                                <ul className="accordion_box clearfix list-unstyled">
                                    {renderFaqs(faqsRight, faqsLeft.length)}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                {/* <Fade direction="up" triggerOnce={false} duration={500} delay={3}> */}
                    <div className="xb-btn text-center mt-70">
                        <Link
                            href="/contact"
                            className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data_blue"
                        >
                            <div className="xb-item--hidden">
                                <span className="xb-item--hidden-text">Ask Your Question</span>
                            </div>
                            <div className="xb-item--holder">
                                <span className="xb-item--text xb-item--text1">
                                    Ask Your Question
                                </span>
                                <div className="xb-item--icon">
                                    <i className="fal fa-plus"></i>
                                </div>
                                <span className="xb-item--text xb-item--text2">
                                    Ask Your Question
                                </span>
                            </div>
                        </Link>
                    </div>
                {/* </Fade> */}
            </div>
        </section>
    );
};

export default FaqSectionClient;