// components/testimonial/TestimonialSectionClient.tsx
"use client";

import { useRef, useEffect } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Fade } from "react-awesome-reveal";
import 'swiper/css';
import 'swiper/css/navigation';
import Image from 'next/image';

import type { TestimonialItem } from '../../app/actions/testimonialAction';
import tImg1 from '../../public/images/testimonial/sa-tas05.png';

const FALLBACK: TestimonialItem[] = [
    {
        id: '1',
        name: 'Bonsey Johnson',
        role: 'Businessman',
        text: 'Working with luminix was a game-changer for our company. Extremely recommended for businesses looking for transformative solutions.',
        rating: 5,
        imageUrl: '/assets/images/v1/test2.png',
        order: 1,
        sites: ['*'],
    },
    {
        id: '2',
        name: 'Daniel Turner',
        role: 'Founder@ XYZ Company',
        text: 'Our experience was characterized by a results-driven approach that really made a difference. They are a reliable partner for driving success.',
        rating: 5,
        imageUrl: '/assets/images/v1/test1.png',
        order: 2,
        sites: ['*'],
    },
    {
        id: '3',
        name: 'Michael Ramirez',
        role: 'Director Of ZuBaz',
        text: 'Working with luminix was a game-changer for our company. Extremely recommended for businesses looking for transformative solutions.',
        rating: 5,
        imageUrl: '/assets/images/v1/test3.png',
        order: 3,
        sites: ['*'],
    },
    {
        id: '4',
        name: 'Rick Ferrari',
        role: 'Manager',
        text: 'What impressed us the most was their commitment to transparent communication. A trusted partner for navigating complex business landscapes.',
        rating: 5,
        imageUrl: '/assets/images/v1/test4.png',
        order: 4,
        sites: ['*'],
    },
];

interface Props {
    testimonials: TestimonialItem[];
    tClass?: string;
}

const QuoteMark = () => (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
        <path
            d="M14.5 0L9.5 12H14.5V26H0V13L6 0H14.5ZM34 0L29 12H34V26H19.5V13L25.5 0H34Z"
            fill="currentColor"
        />
    </svg>
);

const StarRow = ({ rating }: { rating: number }) => (
    <span className="tm-stars" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
            <svg
                key={i}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={i < rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.4"
            >
                <path d="M12 2.5l2.9 6.1 6.6.6-5 4.5 1.5 6.5L12 16.9 6 20.2l1.5-6.5-5-4.5 6.6-.6L12 2.5z" />
            </svg>
        ))}
    </span>
);

const TestimonialSectionClient: React.FC<Props> = ({ testimonials, tClass = '' }) => {
    const items = testimonials.length > 0 ? testimonials : FALLBACK;

    const prevRef = useRef<HTMLDivElement>(null);
    const nextRef = useRef<HTMLDivElement>(null);
    const swiperRef = useRef<any>(null);

    useEffect(() => {
        if (swiperRef.current && prevRef.current && nextRef.current) {
            swiperRef.current.params.navigation.prevEl = prevRef.current;
            swiperRef.current.params.navigation.nextEl = nextRef.current;
            swiperRef.current.navigation.init();
            swiperRef.current.navigation.update();
        }
    }, []);

    return (
        <section className={`tm-section pt-150 pb-150 ${tClass}`} style={{ backgroundColor: 'rgb(244, 245, 252)' }}>
            <div className="container">
                <div className="tm-heading">
                    {/* <Fade direction="down" triggerOnce={false} duration={500}> */}
                    <span className="tm-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                        99% positive feedback
                    </span>
                    {/* </Fade> */}
                    {/* <Fade direction="up" triggerOnce={false} duration={600} delay={3}> */}
                    <h2 className="tm-title">Feedback That Speaks</h2>
                    {/* </Fade> */}
                </div>
                {/* <Fade direction="up" triggerOnce={false} duration={800} delay={3}> */}
                <div className="tm-slider-wrap">
                    <Swiper
                        modules={[Navigation]}
                        spaceBetween={28}
                        slidesPerView={1}
                        speed={700}
                        onBeforeInit={(swiper) => {
                            swiperRef.current = swiper;
                        }}
                        breakpoints={{
                            0: { slidesPerView: 1 },
                            600: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }}
                    >
                        {items.map((item) => (
                            <SwiperSlide key={item.id}>
                                <article className="tm-card">
                                    <span className="tm-quote-icon"><QuoteMark /></span>
                                    <p className="tm-text" dangerouslySetInnerHTML={{ __html: item.text }} />

                                    <div className="tm-footer">
                                        <div className="tm-avatar">
                                            <Image
                                                src={item.imageUrl || tImg1}
                                                alt={item.name}
                                                width={56}
                                                height={56}
                                            />
                                        </div>
                                        <div className="tm-person">
                                            <span className="tm-name" dangerouslySetInnerHTML={{ __html: item.name }} />
                                            <span className="tm-role" dangerouslySetInnerHTML={{ __html: item.role }} />
                                        </div>
                                        <StarRow rating={item.rating} />
                                    </div>
                                </article>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    <div className="tm-nav">
                        <div className="tm-nav-btn" ref={prevRef} aria-label="Previous testimonial">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </div>
                        <div className="tm-nav-btn" ref={nextRef} aria-label="Next testimonial">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    </div>
                </div>
                {/* </Fade> */}
            </div>
        </section>
    );
};

export default TestimonialSectionClient;