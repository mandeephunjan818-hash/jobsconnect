"use client";

import VideoPopup from '../../../../modal/VideoPopup';
import Image from 'next/image';
import { useState } from 'react';
import { FiUser, FiCheckSquare, FiShield } from 'react-icons/fi';
import type { WhyChooseUsData } from '../../../app/actions/whyChooseAction';

interface Props {
    data: WhyChooseUsData;
}

export default function WhyChooseHomeOne({ data }: Props) {
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    const {
        tagline,
        title,
        paragraph,
        youtubeId,
        thumbnailUrl,
        playButtonImageUrl,
    } = data;

    const features = [
        {
            icon: <FiUser size={20} color="#fff" />,
            title: "For Job Seekers",
            description: "Find your next opportunity",
        },
        {
            icon: <FiCheckSquare size={20} color="#fff" />,
            title: "For Employers",
            description: "Find the right talent",
        },
        {
            icon: <FiShield size={20} color="#fff" />,
            title: "Trusted Platform",
            description: "Safe. Secure. Reliable.",
        },
    ];

    return (
        <>
            <div className="luminix-padding-section">
                <div className="container">
                    <div className="row align-items-center">
                        {/* ── Video thumb (right column on lg+) ── */}
                        <div className="col-lg-6 order-lg-2">
                            <div className="luminix-video-thumb">
                                <Image
                                    width={526}
                                    height={550}
                                    src={thumbnailUrl}
                                    alt="Why choose us section image"
                                />

                                <a
                                    className="luminix-popup-video video-init"
                                    onClick={() => setIsVideoOpen(true)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Image
                                        width={100}
                                        height={100}
                                        src={playButtonImageUrl}
                                        alt="Play video"
                                    />
                                    <div className="waves wave-1"></div>
                                    <div className="waves wave-2"></div>
                                    <div className="waves wave-3"></div>
                                </a>
                            </div>
                        </div>

                        {/* ── Text + features (left column) ── */}
                        <div className="col-lg-6">
                            <div className="luminix-default-content">
                                <h6>{tagline}</h6>
                                <h2 className="title capitalize">{title}</h2>
                                <p className="text" dangerouslySetInnerHTML={{ __html: paragraph }} />

                                <div className="luminix-skill-wrap mt-50">
                                    <div className="d-flex flex-wrap gap-4">
                                        {features.map((feature) => (
                                            <div
                                                key={feature.title}
                                                className="d-flex align-items-center gap-3"
                                                style={{ minWidth: 200 }}
                                            >
                                                <div
                                                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        backgroundColor: "#2563eb",
                                                    }}
                                                >
                                                    {feature.icon}
                                                </div>
                                                <div>
                                                    <h6 className="mb-0 fw-bold">{feature.title}</h6>
                                                    <p className="mb-0 text-muted small">{feature.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <VideoPopup
                isVideoOpen={isVideoOpen}
                setIsVideoOpen={setIsVideoOpen}
                videoId={youtubeId}
            />
        </>
    );
}