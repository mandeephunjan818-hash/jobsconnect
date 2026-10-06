import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';
import Image from 'next/image';
import Link from 'next/link';
import type { CategoryItem } from '../../../app/actions/categoryAction';

import p1_img from "@/assets/images/portfolio/p1.png";
import p2_img from "@/assets/images/portfolio/p2.png";
import p3_img from "@/assets/images/portfolio/p3.png";
import p4_img from "@/assets/images/portfolio/p4.png";
import p5_img from "@/assets/images/portfolio/p5.png";

const FALLBACK: CategoryItem[] = [
    { name: 'Market Analysis', imageUrl: p1_img.src, count: 94, order: 1, link: '/jobs' },
    { name: 'Development', imageUrl: p4_img.src, count: 87, order: 2, link: '/jobs' },
    { name: 'Company', imageUrl: p2_img.src, count: 52, order: 3, link: '/jobs' },
    { name: 'Area Analysis', imageUrl: p3_img.src, count: 38, order: 4, link: '/jobs' },
    { name: 'Support US', imageUrl: p5_img.src, count: 19, order: 5, link: '/jobs' },
];

interface Props {
    categories: CategoryItem[];
}

function CategoryTile({ cat, rank }: { cat: CategoryItem; rank: number }) {
    return (
        <Link
            href={cat.link}
            className="lx-tile"
            data-aos="fade-up"
            data-aos-duration={String(400 + rank * 100)}
        >
            <Image
                src={cat.imageUrl}
                alt={`${cat.name} category`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 25vw"
                className="lx-tile__img"
            />

            <span className="lx-tile__overlay" aria-hidden="true" />

            {cat.count > 0 && (
                <span className="lx-tile__pill">{cat.count} openings</span>
            )}

            <div className="lx-tile__content">
                <div className="lx-tile__text">
                    {/* <p className="lx-tile__count">{cat.count > 0 ? `${cat.count} jobs` : 'View jobs'}</p> */}
                    <h3 className="lx-tile__name">{cat.name}</h3>
                </div>
                {/* <span className="lx-tile__arrow" aria-hidden="true">
                    <RightArrawWhitIcon />
                </span> */}
            </div>
        </Link>
    );
}

export default function PortfolioHomeTwo({ categories }: Props) {
    const items = (categories.length > 0 ? categories : FALLBACK).slice(0, 7);

    return (
        <>
            <style>{STYLES}</style>

            <div className="luminix-padding-section4">
                <div className="container">

                    {/* Section header */}
                    <div className="luminix-section-title">
                        <div className="row">
                            <div className="col-xl-7 col-lg-8">
                                <h6 className="text-gradient">Job Categories</h6>
                                <h2 className="title pb-0 ml-20 capitalize">
                                    Explore top hiring categories
                                </h2>
                            </div>
                            <div className="col-xl-5 col-lg-4 d-flex align-items-center justify-content-md-end justify-content-center mt-md-auto mt-3">
                                <Link href="/jobs" className="luminix-default-btn pill button-custom" >
                                    View All Categories
                                    <RightArrawWhitIcon />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Bento Grid Container */}
                    <div className="lx-grid">
                        {items.map((cat, i) => (
                            <CategoryTile key={cat.name} cat={cat} rank={i} />
                        ))}
                    </div>

                </div>
            </div>
        </>
    );
}

const STYLES = `
/* ── Bento Grid Layout ── */
.lx-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 190px;
  gap: 24px;
}

/* 7-tile layout, fully tiled across a 4x3 grid — no overlaps */
.lx-grid .lx-tile:nth-child(1) { grid-column: 1 / 3; grid-row: 1 / 3; }  /* hero */
.lx-grid .lx-tile:nth-child(2) { grid-column: 3 / 4; grid-row: 1 / 2; }
.lx-grid .lx-tile:nth-child(3) { grid-column: 4 / 5; grid-row: 1 / 3; } /* tall column */
.lx-grid .lx-tile:nth-child(4) { grid-column: 3 / 4; grid-row: 2 / 3; }
.lx-grid .lx-tile:nth-child(5) { grid-column: 1 / 2; grid-row: 3 / 4; }
.lx-grid .lx-tile:nth-child(6) { grid-column: 2 / 4; grid-row: 3 / 4; } /* wide */
.lx-grid .lx-tile:nth-child(7) { grid-column: 4 / 5; grid-row: 3 / 4; }

/* ── Tile Shell ── */
.lx-tile {
  position: relative;
  display: flex;
  align-items: flex-end;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  background: var(--dark-bg);
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.lx-tile:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 25px -5px color-mix(in srgb, var(--accent-color) 30%, transparent),
              0 10px 10px -5px color-mix(in srgb, var(--accent-color) 12%, transparent);
  z-index: 2;
}

.lx-grid .lx-tile:nth-child(1) {
  border: 1px solid color-mix(in srgb, var(--accent-color) 45%, transparent);
  box-shadow: 0 8px 30px -8px color-mix(in srgb, var(--accent-color) 35%, transparent);
}

/* ── Image — stays true color ── */
.lx-tile__img {
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
}
.lx-tile:hover .lx-tile__img { transform: scale(1.06) !important; }

.lx-tile__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.88) 0%,
    rgba(0, 0, 0, 0.35) 38%,
    transparent 65%
  );
  z-index: 1;
}

.lx-grid .lx-tile:nth-child(3n+2)::after { background: var(--accent-color2); }

/* ── Eyebrow / Pill ── */
.lx-tile__pill {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  color: var(--accent-color);
  font-size: 12px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: 30px;
  opacity: 0;
  transform: translateY(-8px);
  transition: all 0.3s ease;
  pointer-events: none;
}
.lx-tile:hover .lx-tile__pill { opacity: 1; transform: translateY(0); }

.lx-grid .lx-tile:nth-child(1) .lx-tile__pill {
  opacity: 1;
  transform: none;
  background: var(--accent-color);
  color: var(--white-color);
}

/* ── Bottom Content ── */
.lx-tile__content {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px;
  gap: 10px;
}
.lx-grid .lx-tile:nth-child(1) .lx-tile__content { padding: 32px; }

.lx-tile__text {
  flex: 1;
  min-width: 0;
  padding-right: 6px;
}

.lx-tile__count {
  font-size: 11px;
  font-weight: 700;
  color: var(--pink-300);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.lx-tile__count::before {
  content: '';
  width: 7px;
  height: 7px;
  background: var(--accent-color2);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent-color2);
  flex-shrink: 0;
}

.lx-tile__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--white-color);
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}
.lx-grid .lx-tile:nth-child(1) .lx-tile__name,
.lx-grid .lx-tile:nth-child(3) .lx-tile__name,
.lx-grid .lx-tile:nth-child(6) .lx-tile__name {
  -webkit-line-clamp: 2;
}

.lx-grid .lx-tile:nth-child(1) .lx-tile__count { font-size: 13px; margin-bottom: 10px; }
.lx-grid .lx-tile:nth-child(1) .lx-tile__name { font-size: 26px; }

/* ── Arrow ── */
.lx-tile__arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
  color: var(--white-color);
}
.lx-tile:hover .lx-tile__arrow {
  background: var(--gradient-mixed);
  border-color: transparent;
  transform: translate(3px, -3px);
}
.lx-grid .lx-tile:nth-child(1) .lx-tile__arrow { width: 46px; height: 46px; }

/* ── Responsive: Tablet (2 columns) ── */
@media (max-width: 1024px) {
  .lx-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 200px; gap: 18px; }
  .lx-grid .lx-tile { grid-column: auto !important; grid-row: auto !important; }
  .lx-grid .lx-tile:nth-child(1) { grid-column: 1 / 3 !important; grid-row: 1 / 3 !important; }
  .lx-grid .lx-tile:nth-child(3) { grid-column: 1 / 3 !important; height: 200px; }
  .lx-grid .lx-tile:nth-child(1) .lx-tile__name { font-size: 24px; }
}

/* ── Responsive: Mobile — strict single column, every card stacked ── */
@media (max-width: 640px) {
  .lx-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 14px;
    margin-top: 28px;
  }

  .lx-grid .lx-tile {
    width: 100% !important;
    height: 240px !important;
    grid-column: unset !important;
    grid-row: unset !important;
  }

  .lx-grid .lx-tile:nth-child(1) { height: 300px !important; }

  .lx-tile__content { padding: 20px; }
  .lx-tile__name { font-size: 16px; -webkit-line-clamp: 2 !important; }
  .lx-grid .lx-tile:nth-child(1) .lx-tile__name { font-size: 24px; }
  .lx-tile__pill { top: 14px; left: 14px; padding: 6px 12px; font-size: 11px; }
}
`;