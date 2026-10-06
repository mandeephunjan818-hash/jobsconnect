import Image from 'next/image';
import Link from 'next/link';
import type { BlogPostItem } from '../../../app/actions/blogActions';
import date_img from "@/assets/images/blog/date.svg";
import blog4_img from "@/assets/images/blog/blog4.png";
import blog5_img from "@/assets/images/blog/blog5.png";
import blog6_img from "@/assets/images/blog/blog6.png";
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';

// ─── Fallback when DB is empty ────────────────────────────────
const FALLBACK: BlogPostItem[] = [
    {
        id: '1',
        title: '5 tips for business leaders for a productive week',
        excerpt: 'As a business leader, the way you begin your week sets the tone for the days ahead. Adopting positive habits and strategic planning can...',
        imageUrl: blog4_img.src,
        category: 'Business',
        date: new Date('2024-07-05').toISOString(),
        slug: 'tips-for-business-leaders',
        order: 1,
    },
    {
        id: '2',
        title: 'How to start making 10x more money online',
        excerpt: 'To start charging 10x more by next month, you need to stop selling..',
        imageUrl: blog5_img.src,
        category: 'Finance',
        date: new Date('2024-07-03').toISOString(),
        slug: 'making-more-money-online',
        order: 2,
    },
    {
        id: '3',
        title: 'Caring team during the holiday season',
        excerpt: 'The holiday season is a time for celebration, gratitude, and...',
        imageUrl: blog6_img.src,
        category: 'Culture',
        date: new Date('2024-06-27').toISOString(),
        slug: 'caring-team-holiday-season',
        order: 3,
    },
];

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function overview(data: any) {
    const rawOverview = data || "";
    const cleanText = rawOverview.replace(/<\/?[^>]+(>|$)/g, "");
    const charLimit = 100;
    return cleanText.length > charLimit ? `${cleanText.slice(0, charLimit)}...` : cleanText;
}

interface Props {
    posts: BlogPostItem[];
}

export default function BlogHomeTwo({ posts }: Props) {
    const items = posts.length > 0 ? posts : FALLBACK;
    const [featured, ...smallPosts] = items;

    return (
        <div className="lmx-blog-home light-bg1">
            <div className="container">
                <div className="lmx-blog-home__head">
                    <div>
                        <h6 className="text-gradient lmx-blog-home__eyebrow">Our Latest News</h6>
                        <h2 className="title pb-0 lmx-blog-home__title">
                            Explore our latest blogs and news
                        </h2>
                    </div>
                    <Link
                        prefetch={false}
                        href="/blog"
                        className="luminix-default-btn pill text-white button-custom lmx-blog-home__view-all"
                    >
                        View All Post
                        <RightArrawWhitIcon />
                    </Link>
                </div>

                <div className="lmx-blog-home__grid">
                    {/* ── Left: large featured post ─────────────────────── */}
                    {featured && (
                        <Link
                            href={`/blog/${featured.slug}`}
                            className="lmx-blog-card lmx-blog-card--featured"
                            data-aos="fade-up"
                            data-aos-duration="700"
                        >
                            <div className="lmx-blog-card__thumb lmx-blog-card__thumb--featured">
                                <Image
                                    width={636}
                                    height={339}
                                    src={featured.imageUrl}
                                    alt={featured.title}
                                />
                            </div>
                            <div className="lmx-blog-card__body">
                                <span className="lmx-blog-card__meta">
                                    <Image width={14} height={14} src={date_img} alt="" aria-hidden="true" />
                                    {formatDate(featured.date)}
                                </span>
                                <h5 className="lmx-blog-card__title lmx-blog-card__title--lg">
                                    {featured.title}
                                </h5>
                                <p
                                    className="lmx-blog-card__excerpt"
                                    dangerouslySetInnerHTML={{ __html: overview(featured.excerpt) }}
                                />
                                <span className="lmx-blog-card__cta">
                                    Read More <RightArrawWhitIcon />
                                </span>
                            </div>
                        </Link>
                    )}

                    {/* ── Right: small posts stacked ───────────────── */}
                    <div className="lmx-blog-home__side">
                        {smallPosts.slice(0, 2).map((post, idx) => (
                            <Link
                                href={`/blog/${post.slug}`}
                                key={post.id}
                                className="lmx-blog-card lmx-blog-card--row"
                                data-aos="fade-up"
                                data-aos-duration={idx === 0 ? '900' : '1100'}
                            >
                                <div className="lmx-blog-card__thumb lmx-blog-card__thumb--row">
                                    <Image
                                        width={306}
                                        height={283}
                                        src={post.imageUrl}
                                        alt={post.title}
                                    />
                                </div>
                                <div className="lmx-blog-card__body">
                                    <span className="lmx-blog-card__meta">
                                        <Image width={14} height={14} src={date_img} alt="" aria-hidden="true" />
                                        {formatDate(post.date)}
                                    </span>
                                    <h5 className="lmx-blog-card__title">
                                        {post.title}
                                    </h5>
                                    <p
                                        className="lmx-blog-card__excerpt"
                                        dangerouslySetInnerHTML={{ __html: overview(post.excerpt) }}
                                    />
                                    <span className="lmx-blog-card__cta">
                                        Read More <RightArrawWhitIcon />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .lmx-blog-home { padding: 56px 0; }

                /* ── Header row ── */
                .lmx-blog-home__head {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                    margin-bottom: 28px;
                }
                .lmx-blog-home__eyebrow { margin-bottom: 6px; font-size: 14px; }
                .lmx-blog-home__title {
                    font-size: 28px;
                    text-transform: capitalize;
                    margin: 0;
                    line-height: 1.25;
                }
                .lmx-blog-home__view-all {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    white-space: nowrap;
                    font-size: 13.5px;
                    padding: 11px 20px;
                }
                @media (max-width: 575px) {
                    .lmx-blog-home__title { font-size: 21px; }
                    .lmx-blog-home__head { align-items: flex-start; }
                }

                /* ── Grid layout ── */
                .lmx-blog-home__grid {
                    display: grid;
                    grid-template-columns: 1.05fr 1fr;
                    gap: 22px;
                    align-items: stretch;
                }
                @media (max-width: 991px) {
                    .lmx-blog-home__grid { grid-template-columns: 1fr; }
                }

                .lmx-blog-home__side {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                /* ── Card shell ── */
                .lmx-blog-card {
                    display: block;
                    background: #fff;
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 2px 14px rgba(15, 23, 42, 0.06);
                    border: 1px solid rgba(15, 23, 42, 0.05);
                    transition: transform .2s ease, box-shadow .2s ease;
                    text-decoration: none;
                }
                .lmx-blog-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
                }

                /* Featured card: image stacked on top of content */
                .lmx-blog-card--featured { display: flex; flex-direction: column; height: 100%; }
                .lmx-blog-card__thumb--featured {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 22 / 9;
                    overflow: hidden;
                }
                .lmx-blog-card__thumb--featured img {
                    width: 100%; height: 100%; object-fit: cover;
                }
                .lmx-blog-card--featured .lmx-blog-card__body { flex: 1; display: flex; flex-direction: column; }

                /* Row card: image left, content right — collapses to stacked on small screens */
                .lmx-blog-card--row {
                    display: grid;
                    grid-template-columns: 230px 1fr;
                    gap: 0;
                    flex: 1;
                }
                .lmx-blog-card__thumb--row {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    min-height: 140px;
                    overflow: hidden;
                }
                .lmx-blog-card__thumb--row img {
                    width: 100%; height: 100%; object-fit: cover;
                }
                @media (max-width: 720px) {
                    .lmx-blog-card__thumb--featured { aspect-ratio:auto; }
                    .lmx-blog-card--row { grid-template-columns: 1fr; }
                    .lmx-blog-card__thumb--row { min-height: 100%; }
                }

                /* ── Card body ── */
                .lmx-blog-card__body { padding: 18px; }
                .lmx-blog-card--row .lmx-blog-card__body { padding: 14px 16px; }

                .lmx-blog-card__meta {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    font-weight: 400;
                    color: var(--accent-color, #6d28d9);
                    margin-bottom: 8px;
                }
                .lmx-blog-card__meta img { flex-shrink: 0; }

                .lmx-blog-card__title {
                    font-size: 15px;
                    font-weight: 700;
                    line-height: 1.4;
                    color: var(--heading-color, #0f172a);
                    margin: 0 0 8px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .lmx-blog-card__title--lg {
                    font-size: 18px;
                    -webkit-line-clamp: 2;
                }
                .lmx-blog-card:hover .lmx-blog-card__title { color: var(--accent-color, #6d28d9); }

                .lmx-blog-card__excerpt {
                    font-size: 13px;
                    line-height: 1.55;
                    color: #64748b !important;
                    margin: 0 0 14px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .lmx-blog-card--row .lmx-blog-card__excerpt {
                    -webkit-line-clamp: 2;
                    margin-bottom: 10px;
                    font-size: 12.5px;
                }

                .lmx-blog-card__cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--accent-color, #6d28d9);
                    margin-top: auto;
                }

                @media (max-width: 575px) {
                    .lmx-blog-card__body { padding: 14px; }
                    .lmx-blog-card__title--lg { font-size: 16px; }
                }
            `}</style>
        </div>
    );
}