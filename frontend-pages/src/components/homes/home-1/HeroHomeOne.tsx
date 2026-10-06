"use client";
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import type { JobSearchIndex } from '@/app/actions/jobSearchData';
import { FiUser, FiBriefcase, FiSearch, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { MdWorkOutline } from "react-icons/md";
import Link from 'next/link';

interface Props {
  searchIndex: JobSearchIndex;
}

const MAX_SUGGESTIONS = 6;

export default function HeroHomeOne({ searchIndex }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [jobMode, setJobMode] = useState('');

  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const [debouncedTitle, setDebouncedTitle] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');

  const titleWrapRef = useRef<HTMLDivElement>(null);
  const locationWrapRef = useRef<HTMLDivElement>(null);

  const features = [
    { icon: <FiUser size={18} />, title: "For Job Seekers", description: "Find your next opportunity", link: "/jobs" },
    { icon: <MdWorkOutline size={18} />, title: "For Employers", description: "Find the right talent", link: "/dashboard/listings" },
    // { icon: <FiShield size={18} />, title: "Trusted Platform", description: "Safe. Secure. Reliable." },
  ];

  useEffect(() => { AOS.init({ duration: 900, once: true }); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (titleWrapRef.current && !titleWrapRef.current.contains(e.target as Node)) setShowTitleDropdown(false);
      if (locationWrapRef.current && !locationWrapRef.current.contains(e.target as Node)) setShowLocationDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebouncedTitle(title), 200); return () => clearTimeout(t); }, [title]);
  useEffect(() => { const t = setTimeout(() => setDebouncedLocation(location), 200); return () => clearTimeout(t); }, [location]);

  const titleSuggestions = useMemo(() => {
    const q = debouncedTitle.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex.titles.filter(t => t.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [debouncedTitle, searchIndex.titles]);

  const locationSuggestions = useMemo(() => {
    const q = debouncedLocation.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex.locations.filter(l => l.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [debouncedLocation, searchIndex.locations]);

  useEffect(() => {
    setShowTitleDropdown(titleSuggestions.length > 0 && document.activeElement?.id === 'hero-title-input');
  }, [titleSuggestions]);

  useEffect(() => {
    setShowLocationDropdown(locationSuggestions.length > 0 && document.activeElement?.id === 'hero-location-input');
  }, [locationSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (title.trim()) params.set('q', title.trim());
    if (location.trim()) params.set('location', location.trim());
    if (jobMode) params.set('mode', jobMode);
    setShowTitleDropdown(false);
    setShowLocationDropdown(false);
    router.push(params.toString() ? `/jobs?${params.toString()}` : '/jobs');
  };

  return (
    <section className="luminix-hero-section section luminix-here-bg">
      <div className="container">
        <div className="luminix-hero-content d-flex flex-column align-items-start text-start">
          {/* ── Title + description ── */}
          <h1
            data-aos="fade-up"
            data-aos-duration="800"
            className="hero-heading"
          >
            One <span className="hero-heading__accent text-gradient">Opportunity</span><br />
            Can Change <span className="hero-heading__accent text-gradient">Your Direction</span>.
          </h1>

          <p
            data-aos="fade-up"
            data-aos-duration="950"
            data-aos-delay="100"
            className="hero-sub"
          >
            Looking for your next job or ready for a fresh start? Explore opportunities, find the right fit, and take the next step with confidence.
            {/* <br className="d-none d-md-inline" /> to build better futures, together. */}
          </p>

          {/* ── Search bar ── */}
          <form
            onSubmit={handleSearch}
            className="hero-search"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="200"
            autoComplete="off"
          >
            <div className="hero-search__field" ref={titleWrapRef}>
              <FiSearch size={14} className="hero-search__icon" />
              <input
                id="hero-title-input"
                type="text"
                placeholder="Job title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={() => titleSuggestions.length > 0 && setShowTitleDropdown(true)}
              />
              {showTitleDropdown && (
                <ul className="hero-search__suggestions">
                  {titleSuggestions.map(t => (
                    <li key={t}>
                      <button type="button" onMouseDown={() => { setTitle(t); setDebouncedTitle(t); setShowTitleDropdown(false); }}>{t}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hero-search__divider" />

            <div className="hero-search__field" ref={locationWrapRef}>
              <FiMapPin size={14} className="hero-search__icon" />
              <input
                id="hero-location-input"
                type="text"
                placeholder="Location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                onFocus={() => locationSuggestions.length > 0 && setShowLocationDropdown(true)}
              />
              {showLocationDropdown && (
                <ul className="hero-search__suggestions">
                  {locationSuggestions.map(l => (
                    <li key={l}>
                      <button type="button" onMouseDown={() => { setLocation(l); setDebouncedLocation(l); setShowLocationDropdown(false); }}>{l}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hero-search__divider" />

            <div className="hero-search__field hero-search__field--select">
              <FiBriefcase size={14} className="hero-search__icon" />
              <select value={jobMode} onChange={e => setJobMode(e.target.value)}>
                <option value="">Job type</option>
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              <FiChevronDown size={12} className="hero-search__chevron" />
            </div>

            <button type="submit" className="luminix-default-btn pill button-custom">
              <FiSearch size={14} />
              <span>Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── Feature strip (centered, no background, no border) ── */}
      <div className="hero-features bg-transparent" data-aos="fade-up" data-aos-duration="900" data-aos-delay="350">
        {features.map((f, idx) => (
          <Link key={f.title} href={f.link || "#"} className="text-decoration-none">
            <React.Fragment key={f.title}>
              <div className="hero-features__card p-4 rounded">
                <div className="hero-features__icon">{f.icon}</div>
                <div>
                  <p className="hero-features__title">{f.title}</p>
                  <p className="hero-features__desc">{f.description}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 64 64" fill="none" stroke="var(--accent-color)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="48 28 48 16 36 16"></polyline><line x1="48" y1="16" x2="16" y2="48"></line></svg>
              </div>
              {/* {idx < features.length - 1 && <div className="hero-features__sep" />} */}
            </React.Fragment>
          </Link>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 0, height: '50px', background: '#ffffff' }}></div>

      <style>{`
        /* ── Section height 100dvh, background via luminix-here-bg class ── */
        .luminix-hero-section {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          padding: 80px 16px 140px;
        //    background:
        // linear-gradient(
        //     104deg,
        //     rgba(139, 92, 246, 0.40) 0%,
        //     rgba(139, 92, 246, 0.30) 50%,
        //     rgba(139, 92, 246, 0.15) 100%
        // ),
        // url("/job connect banner.jpeg");

    background-size: cover;
    background-position: center right;
    background-repeat: no-repeat;
        }
        .luminix-hero-section .container {
          width: 100%;
        }

        /* ── Title & description ── */
        .hero-heading {
          font-size: clamp(30px, 6vw, 72px);
          font-weight: 800;
          line-height: 1.15;
          color: #0f172a;
          margin-bottom: 14px;
          letter-spacing: -0.5px;
        }
        .hero-heading__accent { color: var(--accent-color); }

        .hero-sub {
          color: #475569;
          font-size: clamp(13.5px, 1.4vw, 15.5px);
          line-height: 1.65;
          margin-bottom: 26px;
          max-width: 480px;
        }

        /* ── Search bar ── */
        .hero-search {
          display: flex;
          align-items: center;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(37,99,235,0.10), 0 2px 8px rgba(0,0,0,0.04);
          padding: 6px 15px;
          width: 100%;
          max-width: 700px;
          flex-wrap: wrap;
          gap: 2px;
        }
        .hero-search__field {
          flex: 1;
          min-width: 120px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          position: relative;
        }
        .hero-search__icon    { flex-shrink: 0; color: #9ca3af; }
        .hero-search__chevron { flex-shrink: 0; color: #9ca3af; pointer-events: none; }
        .hero-search__field input,
        .hero-search__field select {
          width: 100%;
          border: none;
          outline: none;
          font-size: 13px;
          color: #111827;
          background: transparent;
        }
        .hero-search__field--select select { cursor: pointer; appearance: none; }
        .hero-search__divider {
          width: 1px;
          align-self: stretch;
          background: #e5e7eb;
          margin: 4px 0;
          flex-shrink: 0;
        }
        .hero-search__btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-color);
          color: #fff;
          border: none;
          border-radius: 10rem;
          padding: 10px 20px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s, transform .15s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .hero-search__btn:hover { background: #1d4ed8; transform: translateY(-1px); }

        .hero-search__suggestions {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.09);
          list-style: none;
          margin: 0;
          padding: 6px;
          z-index: 50;
          max-height: 220px;
          overflow-y: auto;
        }
        .hero-search__suggestions li button {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 8px 12px;
          font-size: 13px;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          text-transform: capitalize;
        }
        .hero-search__suggestions li button:hover { background: #eff6ff; color: var(--accent-color); }

        @media (max-width: 600px) {
          .hero-search { flex-direction: column; align-items: stretch; }
          .hero-search__divider { display: none; }
          .hero-search__btn { justify-content: center; }
        }

        /* ── Features strip: centered, no background, no border ── */
        .hero-features {
          position: absolute;
          bottom: 10px;
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          border-top-right-radius: 10px;
          border-top-left-radius: 10px;
          // box-shadow:0px -3px 10px #b6b6b64a;
          // width:100%;
          align-items: center;
          justify-content: center;
          gap: 20px;
          /* background & border removed */
          // padding: 12px 24px;
          white-space: nowrap;
        }
        .hero-features__card {
          display: flex;
          align-items: center;
          background: #fff;
          gap: 30px;
          padding: 0 18px;
          box-shadow:0px 0px 10px #b6b6b64a;
        }
        .hero-features__icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .hero-features__title { margin: 0 0 5px 0; font-size: 13px; font-weight: 700; color: #0f172a !important; line-height: 1.3; }
        .hero-features__desc  { margin: 0; font-size: 11px; color: #64748b !important; }
        .hero-features__sep   { width: 1px; height: 34px; background: #e2e8f0; flex-shrink: 0; }

        @media (max-width: 640px) {
          .luminix-hero-section { 
          padding-bottom: 260px;
          padding-top:150px;
          height: auto;
           }
          .hero-features {
            flex-direction: column;
            gap: 10px;
            bottom: 16px;
            // padding: 14px 20px;
            width: calc(100% - 32px);
            white-space: normal;
          }
          .hero-features__sep   { width: 100%; height: 1px; }
          .hero-features__card  { padding: 0; }
        }
      `}</style>
    </section>
  );
}