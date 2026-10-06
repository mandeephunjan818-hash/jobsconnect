// src/components/blog/BlogAreaClient.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    useCallback,
    //  useEffect,
    useMemo,
    // useState 
} from 'react';

import PaginationLeftIcon from '@/svg/PaginationLeftIcon';
import PaginationRightIcon from '@/svg/PaginationRightIcon';
// import RightArrawSmallIcon from '@/svg/RightArrawSmallIcon';

// import icon1_img from "@/assets/images/blog/icon1.svg";
import date_img from "@/assets/images/blog/date.svg";
// import line1_img from "@/assets/images/blog/line1.svg";
// import line2_img from "@/assets/images/blog/line2.svg";
// import line3_img from "@/assets/images/blog/line3.svg";

import type { BlogPostItem } from '@/app/actions/blogActions';
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';

const POSTS_PER_PAGE = 8;

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    });
}

interface Props {
    allPosts: BlogPostItem[];
}

export default function BlogAreaClient({ allPosts }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ── Read state from URL ──────────────────────────────────────────
    const urlQuery = searchParams.get('q') ?? '';
    const urlCategory = searchParams.get('category') ?? '';
    const urlTag = searchParams.get('tag') ?? '';
    const urlPage = parseInt(searchParams.get('page') ?? '1', 10);

    // ── Local search input (not committed to URL until submit) ───────
    // const [searchInput, setSearchInput] = useState(urlQuery);

    // Sync input if URL changes (e.g. browser back)
    // useEffect(() => { setSearchInput(urlQuery); }, [urlQuery]);

    // ── URL updater ──────────────────────────────────────────────────
    const updateURL = useCallback((updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, val]) => {
            if (val) params.set(key, val);
            else params.delete(key);
        });

        // Reset to page 1 whenever filter changes (unless explicitly setting page)
        if (!('page' in updates)) params.delete('page');

        router.push(`/blog?${params.toString()}`);
    }, [searchParams, router]);

    // ── Derived data ─────────────────────────────────────────────────
    // const categories = useMemo(() => {
    //     const counts: Record<string, number> = {};
    //     allPosts.forEach(p => {
    //         counts[p.category] = (counts[p.category] ?? 0) + 1;
    //     });
    //     return Object.entries(counts)
    //         .map(([name, count]) => ({ name, count }))
    //         .sort((a, b) => b.count - a.count);
    // }, [allPosts]);

    // const allTags = useMemo(() => {
    //     const tagSet = new Set<string>();
    //     allPosts.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
    //     return Array.from(tagSet);
    // }, [allPosts]);

    // const latestPosts = useMemo(() =>
    //     [...allPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
    //     [allPosts]
    // );

    // ── Filtering ────────────────────────────────────────────────────
    const filteredPosts = useMemo(() => {
        return allPosts.filter(post => {
            const matchesSearch = !urlQuery ||
                post.title.toLowerCase().includes(urlQuery.toLowerCase()) ||
                post.excerpt.toLowerCase().includes(urlQuery.toLowerCase());

            const matchesCategory = !urlCategory || post.category === urlCategory;

            // const matchesTag = !urlTag || post.tags?.includes(urlTag);

            return matchesSearch && matchesCategory;
        });
    }, [allPosts, urlQuery, urlCategory, urlTag]);

    // ── Pagination ───────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const safePage = Math.min(Math.max(1, urlPage), totalPages);
    const pagePosts = filteredPosts.slice((safePage - 1) * POSTS_PER_PAGE, safePage * POSTS_PER_PAGE);

    const prevPage = safePage > 1 ? safePage - 1 : null;
    const nextPage = safePage < totalPages ? safePage + 1 : null;

    // ── Handlers ─────────────────────────────────────────────────────
    // const handleSearch = (e: React.FormEvent) => {
    //     e.preventDefault();
    //     updateURL({ q: searchInput.trim() });
    // };

    // const handleCategory = (name: string) => {
    //     updateURL({ category: urlCategory === name ? '' : name });
    // };

    // const handleTag = (tag: string) => {
    //     updateURL({ tag: urlTag === tag ? '' : tag });
    // };

    const handlePage = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        if (page === 1) params.delete('page');
        else params.set('page', String(page));
        router.push(`/blog?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // const overview = (data: any) => {
    //     const rawOverview = data || "";
    //     const cleanText = rawOverview.replace(/<\/?[^>]+(>|$)/g, "");
    //     const charLimit = 100;
    //     const synthesizedOverview = cleanText.length > charLimit
    //         ? `${cleanText.slice(0, charLimit)}...`
    //         : cleanText;

    //     return synthesizedOverview;
    // }

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="luminix-padding-section light-bg1">
            <div className="container">
                <div className="row align-items-start">

                    {/* ── Main column ─────────────────────────────────────── */}
                    <div className="col-lg-12 d-flex flex-column align-items-center">

                        {/* Active filters indicator */}
                        {(urlQuery || urlCategory || urlTag) && (
                            <div className="mb-20" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, color: '#666' }}>
                                    {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}
                                </span>
                                {/* {urlQuery && (
                                    <span className="filter-badge">
                                        Search: "{urlQuery}"
                                        <button onClick={() => updateURL({ q: '' })} aria-label="Clear search">×</button>
                                    </span>
                                )}
                                {urlCategory && (
                                    <span className="filter-badge">
                                        Category: {urlCategory}
                                        <button onClick={() => updateURL({ category: '' })} aria-label="Clear category">×</button>
                                    </span>
                                )} */}
                                {urlTag && (
                                    <span className="filter-badge">
                                        Tag: {urlTag}
                                        <button onClick={() => updateURL({ tag: '' })} aria-label="Clear tag">×</button>
                                    </span>
                                )}
                                <button
                                    onClick={() => router.push('/blog')}
                                    style={{ fontSize: 13, color: '#999', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                        {/* Posts */}
                        <div className='row justify-content-start gap-0 w-100' style={{ alignItems: "stretch" }}>
                            {pagePosts.length === 0 ? (
                                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                    <h4>No posts found</h4>
                                    <p style={{ color: '#666', marginTop: 8 }}>Try adjusting your search or filters.</p>
                                    <button
                                        onClick={() => router.push('/blog')}
                                        className="luminix-default-btn pill mt-20 button-custom"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            ) : (
                                pagePosts.map((post, idx) => (
                                    <div className='p-2 col-md-3 col-12 d-flex align-items-stretch ' >
                                        <Link href={`/blog/${post.slug}`}>
                                            <div
                                                key={post.id}
                                                className="luminix-blog-wrap2 wrap4 p-0 me-0 "
                                                data-aos="fade-up"
                                                data-aos-duration={String(500 + idx * 100)}
                                            >
                                                <div className="luminix-blog-thumb2">
                                                    <Image width={824} height={230} src={post.imageUrl} alt={post.title} />
                                                </div>
                                                <div className="luminix-blog-content2 bg-white">
                                                    <div className="luminix-blog-meta">
                                                        {/* <Link href="/blog">
                                                        <Image width={15} className='blue-shift' height={18} src={icon1_img} alt="" aria-hidden="true" />
                                                        By Admin
                                                    </Link> */}
                                                        <Link href={`/blog/${post.slug}`}>
                                                            <Image width={15} className='blue-shift' height={16} src={date_img} alt="/blog-date-time-image-icon" aria-hidden="true" />
                                                            {formatDate(post.date)}
                                                        </Link>
                                                        {/* Category badge */}
                                                        {/* <button
                                                        onClick={() => handleCategory(post.category)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <span style={{ fontSize: 13, color: '#f97316' }}>{post.category}</span>
                                                    </button> */}
                                                    </div>
                                                    <div className="title pt-0">
                                                        <div className="blog-title" style={{ lineHeight: "normal" }} >
                                                            <Link href={`/blog/${post.slug}`} style={{ fontSize: "16px", lineHeight: "normal" }}>{post.title}</Link>
                                                        </div>
                                                    </div>
                                                    {/* <p dangerouslySetInnerHTML={{ __html: overview(post.excerpt) }} /> */}
                                                    <Link href={`/blog/${post.slug}`} className="luminix-default-btn pill text-white button-custom">
                                                        Read More<RightArrawWhitIcon />
                                                    </Link>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="luminix-pagination center">
                                <button
                                    className={`pagi-btn btn2${!prevPage ? ' disabled' : ''}`}
                                    onClick={() => prevPage && handlePage(prevPage)}
                                    disabled={!prevPage}
                                    aria-label="Previous page"
                                >
                                    <PaginationLeftIcon />
                                </button>

                                <ul>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                                        <li key={num}>
                                            <button
                                                className={`pagi-btn btn2 pagi-btn-num${num === safePage ? 'current text-white bg-primary' : ''}`}
                                                onClick={() => handlePage(num)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', transform: "rotate(0deg)" }}
                                            >
                                                {num}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`pagi-btn${!nextPage ? ' disabled' : ''}`}
                                    onClick={() => nextPage && handlePage(nextPage)}
                                    disabled={!nextPage}
                                    aria-label="Next page"
                                >
                                    <PaginationRightIcon />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Sidebar ─────────────────────────────────────────── */}
                    {/* <div className="col-lg-4" style={{ position: "sticky", top: "15%", height: "80vh", overflowY: "auto", overflowX: "hidden" }}>
                        <div className="luminix-blog-sidebar">
                            <div className="luminix-blog-widgets">
                                <form onSubmit={handleSearch}>
                                    <div className="luminix-search-box">
                                        <input
                                            type="search"
                                            placeholder="Type to search..."
                                            value={searchInput}
                                            onChange={e => setSearchInput(e.target.value)}
                                        />
                                        <button type="submit" id="luminix-search-btn">
                                            <i className="ri-search-line"></i>
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div className="luminix-blog-widgets">
                                <h5>Blog Categories</h5>
                                <Image width={191} height={2} className="line" src={line1_img} alt="" aria-hidden="true" />
                                <div className="luminix-blog-categorie">
                                    <ul>
                                        {categories.map(cat => (
                                            <li key={cat.name}>
                                                <button
                                                    onClick={() => handleCategory(cat.name)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        fontWeight: urlCategory === cat.name ? 700 : 400,
                                                        textDecoration: urlCategory === cat.name ? 'underline' : 'none',
                                                    }}
                                                >
                                                    {cat.name} ({cat.count})
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="luminix-blog-widgets">
                                <h5>Recent Posts</h5>
                                <Image width={155} height={2} className="line" src={line3_img} alt="" aria-hidden="true" />
                                {latestPosts.map((post, idx) => (
                                    <Link
                                        key={post.id}
                                        className={` d-flex flex-md-row flex-column  luminix-recent-post-item flex-nowrap ${idx === 0 ? ' pt-15' : ''}`}
                                        href={`/blog/${post.slug}`}
                                    >
                                        <div className="luminix-recent-post-thumb">
                                            <Image width={150} height={100} src={post.imageUrl} alt={post.title} />
                                        </div>
                                        <div className="luminix-recent-post-data">
                                            <span className="mx-auto" >
                                                <Image width={15} height={16} className='blue-shift' src={date_img} alt="" aria-hidden="true" />
                                                {formatDate(post.date)}
                                            </span>
                                            <div className="blog mx-auto "><h6>{post.title}</h6></div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {allTags.length > 0 && (
                                <div className="luminix-blog-widgets">
                                    <h5>Tags</h5>
                                    <Image width={56} height={2} className="line" src={line2_img} alt="" aria-hidden="true" />
                                    <div className="luminix-blog-tags">
                                        <ul>
                                            {allTags.map(tag => (
                                                <li key={tag}>
                                                    <button
                                                        onClick={() => handleTag(tag)}
                                                        style={{
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            fontWeight: urlTag === tag ? 700 : 400,
                                                            textDecoration: urlTag === tag ? 'underline' : 'none',
                                                        }}
                                                    >
                                                        {tag}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div> */}

                </div>
            </div>
        </div>
    );
}