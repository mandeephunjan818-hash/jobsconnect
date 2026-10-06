// BlogPreviewSectionClient.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Fade } from 'react-awesome-reveal';
import type { BlogPostItem } from '../../app/actions/blogActions';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function truncate(text: string, limit = 130): string {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
}

interface Props {
    posts: BlogPostItem[];
    /** Where the "View All Articles" button should link. Defaults to /blog. */
    viewAllHref?: string;
}

const BlogPreviewSectionClient: React.FC<Props> = ({ posts, viewAllHref = '/blog' }) => {
    return (
        <section className="blog blogp-section pos-rel pt-150 pb-150">
            <div className="container">
                <div className="da-blog-wrapper">

                    <div className="sec-title--two text-center mb-30">
                        {/* <Fade direction="down" triggerOnce={false} duration={500} delay={3}> */}
                            <div>
                                <div className="sub-title wow fadeInDown tm-badge" data-wow-duration="600ms">
                                    <i className="fal fa-newspaper me-2" aria-hidden="true" /> Our Blog
                                </div>
                            </div>
                        {/* </Fade> */}
                        {/* <Fade direction="up" triggerOnce={false} duration={600} delay={3}> */}
                            <div>
                                <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                                    Career Tips &amp; Job Search Insights
                                </h2>
                            </div>
                        {/* </Fade> */}
                    </div>

                    {/* <Fade direction="up" triggerOnce={false} duration={800} delay={9}> */}
                        <div className="row mt-none-40">
                            {posts.map((post) => (
                                <div className="col-lg-4 col-md-6 mt-40 d-flex" key={post.id}>
                                    <article className="da-blog-item blogp-card h-100 w-100 d-flex flex-column">
                                        <Link
                                            href={`/blog/${post.slug}`}
                                            className="xb-item--img blogp-card__media"
                                            aria-label={post.title}
                                        >
                                            <Image
                                                src={post.imageUrl}
                                                alt={post.title}
                                                fill
                                                sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 380px"
                                            />
                                            {post.category && (
                                                <span className="blogp-card__tag">{post.category}</span>
                                            )}
                                        </Link>

                                        <div className="xb-item--holder d-flex flex-column flex-grow-1">
                                            <span className="xb-item--date">
                                                <i className="fal fa-calendar-alt" aria-hidden="true" />{' '}
                                                {formatDate(post.date)}
                                            </span>

                                            <h3 className="xb-item--title border-effect">
                                                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                                            </h3>

                                            {post.excerpt && (
                                                <p className="blogp-card__excerpt flex-grow-1" dangerouslySetInnerHTML={{ __html: truncate(post.excerpt) }}></p>
                                            )}

                                            <Link href={`/blog/${post.slug}`} className="xb-item--arrow mt-auto">
                                                <span>
                                                    <i className="fal fa-arrow-right" aria-hidden="true" />
                                                </span>
                                                Read Article
                                            </Link>
                                        </div>
                                    </article>
                                </div>
                            ))}
                        </div>
                    {/* </Fade> */}

                    {/* <Fade direction="up" triggerOnce={false} duration={500} delay={3}> */}
                        <div className="text-center blogp-viewall-wrap">
                            <Link href={viewAllHref} className="blogp-viewall">
                                View All Articles
                                <i className="fal fa-arrow-right" aria-hidden="true" />
                            </Link>
                        </div>
                    {/* </Fade> */}
                </div>
            </div>

            <style jsx global>{`
        .blogp-section {
          background: var(--bg-page, #f5f7fc);
        }

        .blogp-card__media {
          position: relative;
          display: block;
          aspect-ratio: 23 / 11;
        }

        .blogp-card__media img {
          object-fit: cover;
        }

        .blogp-card__tag {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 2;
          padding: 5px 14px;
          font-family: var(--font-body, inherit);
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.01em;
          text-transform: capitalize;
          color: var(--color-primary, #1438bc);
          background: var(--color-white, #fff);
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(20, 23, 43, 0.14);
        }

        .blogp-card__excerpt {
          font-family: var(--font-body, inherit);
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-secondary, #5b6172);
          margin: 0 0 22px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blogp-card .xb-item--date i {
          margin-right: 4px;
          color: var(--color-primary, #1438bc);
        }

        .blogp-viewall-wrap {
          margin-top: clamp(28px, 4vw, 50px);
        }

        .blogp-viewall {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 36px;
          font-family: var(--font-heading, inherit);
          font-weight: 400;
          font-size: 15px;
          letter-spacing: 0.01em;
          color: var(--color-white, #fff);
          background: var(--color-primary, #2c52bd);
          border-radius: 50px;
          transition: background 0.3s ease, transform 0.3s ease;
        }

        .blogp-viewall i {
          transition: transform 0.3s ease;
        }

        .blogp-viewall:hover {
          background: var(--color-navy, #16215c);
          color: #fff;
          transform: translateY(-3px);
        }

        .blogp-viewall:hover i {
          transform: translateX(4px);
        }

        @media (max-width: 767px) {
          .blogp-card__media {
            aspect-ratio: 16 / 10;
          }
        }
      `}</style>
        </section>
    );
};

export default BlogPreviewSectionClient;