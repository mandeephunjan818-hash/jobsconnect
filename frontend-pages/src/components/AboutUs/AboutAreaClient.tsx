"use client";

/**
 * AboutAreaClient.tsx
 *
 * Pure display component — receives AboutStoryData from AboutStoryFetcher.
 * Renders:
 *   LEFT  col  → mainImage (large) + sideImages[0] + sideImages[1] (overlapping)
 *                + stats row across the bottom
 *   RIGHT col  → heading, description, listItems, button
 */

import Image from 'next/image';
import Link from 'next/link';
import type { AboutStoryData } from '../../app/actions/aboutStoryAction';

interface Props {
    data: AboutStoryData;
}

export default function AboutStoryClient({ data }: Props) {
    const {
        heading,
        description,
        listItems,
        buttonText,
        buttonLink,
        mainImage,
        sideImages,
        stats,
    } = data;

    return (
        <div className="luminix-padding-section">
            <div className="container">
                <div className="row align-items-center">

                    {/* ── LEFT: Images + Stats ── */}
                    <div className="col-lg-6">
                        <div className="luminix-about-thumb-wrap">

                            {/* Main large image */}
                            <div className="luminix-about-main-thumb">
                                <Image
                                    width={530}
                                    height={550}
                                    src={mainImage}
                                    alt="About us main image"
                                />
                            </div>

                            {/* Side image 1 (top-right overlap) */}
                            {sideImages[0] && (
                                <div className="luminix-about-side-thumb1">
                                    <Image
                                        width={200}
                                        height={220}
                                        src={sideImages[0]}
                                        alt="About us supporting image"
                                    />
                                </div>
                            )}

                            {/* Side image 2 (bottom overlap) */}
                            {sideImages[1] && (
                                <div className="luminix-about-side-thumb2">
                                    <Image
                                        width={200}
                                        height={220}
                                        src={sideImages[1]}
                                        alt="About us supporting image"
                                    />
                                </div>
                            )}

                            {/* Stats row */}
                            {stats.length > 0 && (
                                <div className="luminix-about-counter-wrap">
                                    {stats.map((stat, idx) => (
                                        <div key={idx} className="luminix-about-counter-item">
                                            <h3>
                                                {stat.number}
                                                {stat.suffix && (
                                                    <span className="luminix-counter-suffix">
                                                        {stat.suffix}
                                                    </span>
                                                )}
                                            </h3>
                                            <p>{stat.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: Text content ── */}
                    <div className="col-lg-6">
                        <div className="luminix-default-content">

                            <h2 className="title pt-0">{heading}</h2>
                            <p className="text4">{description}</p>

                            {/* List items */}
                            {listItems.length > 0 && (
                                <ul className="luminix-about-list">
                                    {listItems.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}

                            {/* CTA button */}
                            <div className="luminix-about-btn mt-40">
                                <Link
                                    href={buttonLink}
                                    prefetch={false}
                                    className="luminix-default-btn"
                                >
                                    {buttonText}
                                </Link>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}