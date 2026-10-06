'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

interface BlogCardProps {
    post: BlogPostItem;
}

const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
    return (
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
                    <p
                        className="blogp-card__excerpt flex-grow-1"
                        dangerouslySetInnerHTML={{ __html: truncate(post.excerpt) }}
                    ></p>
                )}

                <Link href={`/blog/${post.slug}`} className="xb-item--arrow mt-auto">
                    <span>
                        <i className="fal fa-arrow-right" aria-hidden="true" />
                    </span>
                    Read Article
                </Link>
            </div>
        </article>
    );
};

export default BlogCard;