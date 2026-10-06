'use client';

import React, { useState, useMemo } from 'react';
import BlogCard from './BlogCard';
import type { BlogPostItem } from '../../app/actions/blogActions';

interface Props {
    posts: BlogPostItem[];
    postsPerPage?: number;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | 'ellipsis')[] = [1];

    if (current > 3) pages.push('ellipsis');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push('ellipsis');

    pages.push(total);
    return pages;
}

const BlogGridClient: React.FC<Props> = ({ posts, postsPerPage = 9 }) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(posts.length / postsPerPage));

    const visiblePosts = useMemo(() => {
        const start = (currentPage - 1) * postsPerPage;
        return posts.slice(start, start + postsPerPage);
    }, [posts, currentPage, postsPerPage]);

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        setCurrentPage(page);
        // Scroll the grid back into view on page change, not the whole document top
        document.getElementById('blog-grid-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (!posts.length) {
        return (
            <div className="text-center" style={{ padding: '60px 0' }}>
                <p className="blogp-card__excerpt">No articles published yet.</p>
            </div>
        );
    }

    const pageNumbers = getPageNumbers(currentPage, totalPages);

    return (
        <>
            <div id="blog-grid-top" />
            <div className="row mt-none-40">
                {visiblePosts.map((post) => (
                    <div className="col-lg-4 col-md-6 mt-40 d-flex" key={post.id}>
                        <BlogCard post={post} />
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <nav className="blogp-pagination" aria-label="Blog pagination">
                    <button
                        type="button"
                        className="blogp-pagination__btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        <i className="fal fa-arrow-left" aria-hidden="true" />
                    </button>

                    {pageNumbers.map((p, i) =>
                        p === 'ellipsis' ? (
                            <span key={`ellipsis-${i}`} className="blogp-pagination__ellipsis">…</span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                className={`blogp-pagination__btn${p === currentPage ? ' is-active' : ''}`}
                                onClick={() => goToPage(p)}
                                aria-current={p === currentPage ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        )
                    )}

                    <button
                        type="button"
                        className="blogp-pagination__btn"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                    >
                        <i className="fal fa-arrow-right" aria-hidden="true" />
                    </button>
                </nav>
            )}
        </>
    );
};

export default BlogGridClient;