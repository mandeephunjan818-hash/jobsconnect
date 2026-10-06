'use client';

import React from 'react';
import Link from 'next/link';
import type { JobPreviewItem } from '../../../app/actions/jobListAction';
import { Fade } from 'react-awesome-reveal';
import Image from 'next/image';
import hicon from "../../../public/images/icon/building.svg";

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function stripText(html: string, limit = 120): string {
    const clean = (html || '').replace(/<\/?[^>]+(>|$)/g, '');
    return clean.length > limit ? `${clean.slice(0, limit)}...` : clean;
}

function formatLocations(locations: string[]): string {
    if (!locations.length) return 'Location not specified';
    if (locations.length === 1) return locations[0];
    return `${locations[0]} +${locations.length - 1} more`;
}

interface Props {
    jobs: JobPreviewItem[];
    /** Where the "View All Jobs" card should link. Defaults to /jobs. */
    viewAllHref?: string;
}

const DataSolutioBlogSectionClient: React.FC<Props> = ({ jobs, viewAllHref = '/jobs' }) => {
    return (
        <section
            className="blog pos-rel pb-150 pt-150 bg_img"
            style={{ backgroundColor: '#f4f5fc' }}
        >
            <div className="container">
                <div className="da-blog-wrapper">
                    <div className="sec-title--two text-center mb-30">
                        {/* <Fade direction="down" triggerOnce={false} duration={500} delay={3}> */}
                        <div>
                            <div className="sub-title wow fadeInDown tm-badge" data-wow-duration="600ms">
                                <Image src={hicon} alt="icon" /> Job List
                            </div>
                        </div>
                        {/* </Fade> */}
                        {/* <Fade direction="up" triggerOnce={false} duration={600} delay={3}> */}
                        <div>
                            <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                                Latest job opportunities across Canada
                            </h2>
                        </div>
                        {/* </Fade> */}
                    </div>
                    {/* <Fade direction="up" triggerOnce={false} duration={800} delay={3}> */}
                    <div className="row mt-none-40">
                        {jobs.map((job) => (
                            <div className="col-lg-4 col-md-6 mt-40 d-flex" key={job._id}>
                                <div className="da-blog-item h-100 w-100 d-flex flex-column">
                                    <div className="xb-item--holder d-flex flex-column flex-grow-1">
                                        <span className="xb-item--date">
                                            {formatLocations(job.locations)} · {timeAgo(job.createdAt)}
                                        </span>
                                        <h2 className="xb-item--title border-effect">
                                            <Link
                                                href={`/jobs/${job.slug}`}
                                                className="blog-title-link"
                                                style={{ textTransform: 'capitalize' }}
                                            >
                                                {job.title}
                                            </Link>
                                        </h2>

                                        <p
                                            style={{
                                                fontSize: '0.9rem',
                                                color: '#5a6580',
                                                lineHeight: 1.6,
                                                marginBottom: 18,
                                                flexGrow: 1,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {stripText(job.description)}
                                        </p>

                                        <Link
                                            href={`/jobs/${job.slug}`}
                                            className="xb-item--arrow mt-auto"
                                        >
                                            <span>
                                                <i className="fal fa-arrow-right"></i>
                                            </span>{' '}
                                            View Job
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* <Fade direction="up" triggerOnce={false} duration={500} delay={3}> */}
                        <div className="xb-btn text-center mt-70">
                            <Link
                                href={viewAllHref}
                                className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data_blue"
                            >
                                <div className="xb-item--hidden">
                                    <span className="xb-item--hidden-text">View All</span>
                                </div>
                                <div className="xb-item--holder">
                                    <span className="xb-item--text xb-item--text1">
                                        View All
                                    </span>
                                    <span className="xb-item--icon" >
                                        <i className="fal fa-arrow-right"></i>
                                    </span>
                                    <span className="xb-item--text xb-item--text2">
                                        View All
                                    </span>
                                </div>
                            </Link>
                        </div>
                        {/* </Fade> */}
                    </div>
                    {/* </Fade> */}
                </div>
            </div>
        </section>
    );
};

export default DataSolutioBlogSectionClient;