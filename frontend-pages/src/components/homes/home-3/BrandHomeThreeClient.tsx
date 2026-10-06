"use client";

/**
 * BrandHomeThreeClient.tsx
 *
 * Pure display component — receives brands array from BrandFetcher.
 * No DB calls, no fetching.
 *
 * Slider duplication strategy:
 *   react-slick's infinite scroll needs enough slides to fill the
 *   visible track without gaps. We repeat the brands array until
 *   we have at least MIN_SLIDES items — same visual effect as the
 *   original hardcoded version, but driven by real data.
 */

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Slider from 'react-slick';
import Image from 'next/image';
import type { BrandSliderItem } from '../../../app/actions/brandAction';
import Link from 'next/link';

// Minimum slide count so the infinite loop never shows gaps
const MIN_SLIDES = 20;

const sliderSettings = {
    slidesToShow: 7,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    speed: 8000,
    arrows: false,
    pauseOnHover: false,
    cssEase: 'linear',
    responsive: [
        { breakpoint: 1399, settings: { slidesToShow: 5 } },
        { breakpoint: 1199, settings: { slidesToShow: 4 } },
        { breakpoint: 991, settings: { slidesToShow: 3 } },
        { breakpoint: 0, settings: { slidesToShow: 2 } },
    ],
};

interface Props {
    brands: BrandSliderItem[];
    style_2?: boolean;
}

export default function BrandHomeThree({ brands, style_2 }: Props) {
    // Repeat brands array until we reach MIN_SLIDES
    // e.g. 5 brands → repeated 4× = 20 slides
    const repeatCount = Math.ceil(MIN_SLIDES / brands.length);
    const slides = Array.from({ length: repeatCount }, () => brands).flat();

    return (
        <div
            className={`light-bg1 ${style_2 ? 'luminix-brand-section2' : 'luminix-brand-section'
                }`}
        >
            <Slider {...sliderSettings} className="luminix-brand-slider-wrap">
                {slides.map((brand, idx) => (
                    <div key={`${brand._id}-${idx}`} className="luminix-brand-item">
                        {brand.websiteUrl ? (
                            <Link
                                prefetch={false}
                                href={brand.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={brand.logoAlt}
                            >
                                <Image
                                    width={190}
                                    height={41}
                                    src={brand.logoUrl}
                                    alt={brand.logoAlt}
                                />
                            </Link>
                        ) : (
                            <Image
                                width={190}
                                height={41}
                                src={brand.logoUrl}
                                alt={brand.logoAlt}
                            />
                        )}
                    </div>
                ))}
            </Slider>
        </div>
    );
}