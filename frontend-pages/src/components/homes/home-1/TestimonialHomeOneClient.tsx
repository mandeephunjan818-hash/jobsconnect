"use client";
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image from 'next/image';

import type { TestimonialItem } from '../../../app/actions/testimonialAction';

// ─── Fallback data (unchanged) ─────────────────────────────────────────────
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

// ─── Small inline "G" mark (stylized, not the literal Google logomark) ─────
function GoogleMark({ size = 32 }: { size?: number }) {
    const inner = Math.round(size * 0.68);
    return (
        <span
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'conic-gradient(#4285F4 0deg 90deg, #EA4335 90deg 180deg, #FBBC05 180deg 270deg, #34A853 270deg 360deg)',
            }}
        >
            <span style={{
                width: inner, height: inner, borderRadius: '50%', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.round(inner * 0.6), fontWeight: 700, color: '#4285F4', fontFamily: 'Georgia, serif',
            }}>
                G
            </span>
        </span>
    );
}

// ─── Star row — reflects the actual rating (rounded to whole stars) ────────
function StarRow({ rating, size = 15 }: { rating: number; size?: number }) {
    const rounded = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return (
        <div style={{ display: 'flex', gap: 2 }} aria-label={`${rating} star rating`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < rounded ? '#FBBC05' : '#e5e7eb'}>
                    <path d="M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.5L12 16.9l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.7L12 2.5z" />
                </svg>
            ))}
        </div>
    );
}

function initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#e74c3c', '#8e44ad', '#2980b9', '#16a085', '#d35400', '#2c3e50'];

interface Props {
    style_2?: boolean;
    testimonials: TestimonialItem[];
}

export default function TestimonialHomeOne({ style_2, testimonials }: Props) {
    const items = testimonials.length > 0 ? testimonials : FALLBACK;

    const avgRating = items.length > 0
        ? items.reduce((sum, item) => sum + (item.rating || 0), 0) / items.length
        : 5;

    return (
        <>
            <style>{`
                .lmx-testimonial-light {
                    background: linear-gradient(43deg,#573cff 0%,#c850c0 80% 100%);
                    padding-top: 80px;
                    padding-bottom: 90px;
                }
                .lmx-testimonial-light .lmx-testi-eyebrow {
                    color: #fff !important;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    font-size: 13px;
                    margin-bottom: 12px;
                }
                .lmx-testimonial-light .lmx-testi-heading {
                    font-family: var(--font-plus-jakarta), sans-serif;
                    font-weight: 800;
                    font-size: 48px;
                    line-height: 1.15;
                    color: #fff;
                    margin: 0;
                }
                .lmx-testimonial-light .lmx-testi-heading span {
                    display: block;
                }
                @media (max-width: 767px) {
                    .lmx-testimonial-light .lmx-testi-heading {
                        font-size: 32px;
                    }
                }
                .lmx-testimonial-light .lmx-testi-rating-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-top: 28px;
                }
                .lmx-testimonial-light .lmx-testi-rating-score {
                    font-size: 22px;
                    font-weight: 700;
                    color: #fff;
                }
                .lmx-testimonial-light .lmx-testi-rating-count {
                    font-size: 14px;
                    color: #fff;
                }
                .lmx-testimonial-light .lmx-testi-slide {
                    height: 100%;
                    padding: 28px 24px 24px;
                    border-radius: 14px;
                    background: #fff;
                    border: 1px solid #e9eaf3;
                    box-shadow: 0 4px 20px rgba(17, 24, 39, 0.04);
                    display: flex;
                    flex-direction: column;
                }
                .lmx-testimonial-light .slick-slide {
                    padding: 10px 12px;
                }
                .lmx-testimonial-light .slick-slide > div {
                    height: 100%;
                }
                .lmx-testimonial-light .lmx-testi-name-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .lmx-testimonial-light .lmx-testi-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-weight: 700;
                    font-size: 15px;
                    overflow: hidden;
                }
                .lmx-testimonial-light .lmx-testi-name {
                    font-weight: 700;
                    font-size: 15px;
                    color: #111827;
                    margin: 0;
                }
                .lmx-testimonial-light .lmx-testi-text {
                    font-size: 14.5px;
                    line-height: 1.7;
                    color: #4b5563;
                    flex: 1;
                    margin-bottom: 18px;
                }
                .lmx-testimonial-light .lmx-testi-footer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12.5px;
                    color: #9ca3af;
                    padding-top: 16px;
                    border-top: 1px solid #f1f2f8;
                }
                .lmx-testimonial-light .slick-dots {
                    bottom: -45px;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .lmx-testimonial-light .slick-dots li {
                    width: auto;
                    height: auto;
                    margin: 0;
                }
                .lmx-testimonial-light .slick-dots li button {
                    width: 9px;
                    height: 9px;
                    padding: 0;
                    border-radius: 50%;
                    background: #d6d9ec;
                }
                .lmx-testimonial-light .slick-dots li button:before {
                    content: none;
                }
                .lmx-testimonial-light .slick-dots li.slick-active button {
                    background: var(--accent-color);
                    width: 22px;
                    border-radius: 6px;
                }
            `}</style>

            <div className="lmx-testimonial-light">
                <div className="container">
                    <div className="luminix-section-title center" style={{ paddingBottom: 0 }}>
                        {style_2 ? null : <p className="lmx-testi-eyebrow">Testimonials</p>}
                        <h2 className="lmx-testi-heading">
                            Words From Our Happy Clients
                        </h2>

                        <div className="lmx-testi-rating-row">
                            <GoogleMark />
                            <span className="lmx-testi-rating-score">{avgRating.toFixed(1)}</span>
                            <StarRow rating={avgRating} size={18} />
                            <span className="lmx-testi-rating-count">Based on {items.length} Google reviews</span>
                        </div>
                    </div>
                </div>

                <div className="container" style={{ marginTop: 50 }}>
                    <Slider
                        slidesToShow={3}
                        slidesToScroll={1}
                        arrows={false}
                        autoplay={true}
                        dots={true}
                        centerMode={false}
                        speed={500}
                        lazyLoad="progressive"
                        responsive={[
                            {
                                breakpoint: 1200,
                                settings: {
                                    slidesToShow: 2,
                                }
                            },
                            {
                                breakpoint: 767,
                                settings: {
                                    slidesToShow: 1,
                                }
                            },
                        ]}
                    >
                        {items.map((item, idx) => (
                            <div key={item.id}>
                                <div className="lmx-testi-slide">
                                    <div className="lmx-testi-name-row">
                                        {item.imageUrl ? (
                                            <div className="lmx-testi-avatar" style={{ background: '#e5e7eb' }}>
                                                <Image width={44} height={44} src={item.imageUrl} alt={item.name} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                            </div>
                                        ) : (
                                            <div className="lmx-testi-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                                                {initials(item.name)}
                                            </div>
                                        )}
                                        <p className="lmx-testi-name">{item.name}</p>
                                    </div>

                                    <StarRow rating={item.rating} />

                                    <p className="lmx-testi-text" style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: item.text }} />

                                    <div className="lmx-testi-footer">
                                        <GoogleMark size={18} />
                                        Posted on Google
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Slider>
                </div>
            </div>
        </>
    );
}