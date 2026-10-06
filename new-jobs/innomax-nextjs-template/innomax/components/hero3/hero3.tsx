"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fade } from "react-awesome-reveal";
import { FiSearch, FiMapPin, FiBriefcase, FiChevronDown } from "react-icons/fi";
import type { JobSearchIndex } from "../../app/actions/jobSearchData";

interface Hero3Props {
  heading?: string;
  description?: string;
  searchIndex: JobSearchIndex;
}

const MAX_SUGGESTIONS = 6;

const Hero3: React.FC<Hero3Props> = ({
  heading = "Find Your First Job in Canada",
  description = "Connect with Canadian employers who value fresh talent. Whether you're a newcomer or just starting your career, discover opportunities that fit your skills and ambitions.",
  searchIndex,
}) => {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [jobMode, setJobMode] = useState("");

  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");

  const titleWrapRef = useRef<HTMLDivElement>(null);
  const locationWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (titleWrapRef.current && !titleWrapRef.current.contains(e.target as Node)) setShowTitleDropdown(false);
      if (locationWrapRef.current && !locationWrapRef.current.contains(e.target as Node)) setShowLocationDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebouncedTitle(title), 200); return () => clearTimeout(t); }, [title]);
  useEffect(() => { const t = setTimeout(() => setDebouncedLocation(location), 200); return () => clearTimeout(t); }, [location]);

  const titleSuggestions = useMemo(() => {
    const q = debouncedTitle.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex.titles.filter((t: any) => t.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [debouncedTitle, searchIndex.titles]);

  const locationSuggestions = useMemo(() => {
    const q = debouncedLocation.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex.locations.filter((l: any) => l.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [debouncedLocation, searchIndex.locations]);

  useEffect(() => {
    setShowTitleDropdown(titleSuggestions.length > 0 && document.activeElement?.id === "hero3-title-input");
  }, [titleSuggestions]);

  useEffect(() => {
    setShowLocationDropdown(locationSuggestions.length > 0 && document.activeElement?.id === "hero3-location-input");
  }, [locationSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (title.trim()) params.set("q", title.trim());
    if (location.trim()) params.set("location", location.trim());
    if (jobMode) params.set("mode", jobMode);
    setShowTitleDropdown(false);
    setShowLocationDropdown(false);
    router.push(params.toString() ? `/jobs?${params.toString()}` : "/jobs");
  };

  return (
    <section className="hero hero-style-six pos-rel">
      <div className="container">
        <div className="hero_wrap">
          <div className="row align-items-center">
            {/* Left content — unchanged */}
            <div className="col-lg-6">
              <div className="xb-hero">
                {/* <Fade direction="up" triggerOnce={false} duration={800}> */}
                <h1
                  className="xb-item--title wow fadeInUp"
                  data-wow-delay="0ms"
                  data-wow-duration="600ms"
                >
                  {heading}
                </h1>
                {/* </Fade> */}

                {/* <Fade direction="up" triggerOnce={false} duration={1000} delay={200}> */}
                <p
                  className="xb-item--content wow fadeInUp"
                  data-wow-delay="150ms"
                  data-wow-duration="600ms"
                >
                  {description}
                </p>
                {/* </Fade> */}

                {/* <Fade direction="up" triggerOnce={false} duration={1200} delay={400}> */}
                <Link
                  href="/contact"
                  className="thm-btn thm-btn--fill_icon thm-btn--data mt-4"
                >
                  <div className="xb-item--hidden">
                    <span className="xb-item--hidden-text">
                      Explore Opportunity
                    </span>
                  </div>
                  <div className="xb-item--holder">
                    <span className="xb-item--text xb-item--text1">
                      Explore Opportunity
                    </span>
                    <span className="xb-item--icon" >
                      <i className="fal fa-arrow-right"></i>
                    </span>
                    <span className="xb-item--text xb-item--text2">
                      Explore Opportunity
                    </span>
                  </div>
                </Link>
                {/* </Fade> */}
              </div>
            </div>

            {/* Right side — job search & filter card, themed to this site */}
            <div className="col-lg-6">
              {/* <Fade direction="right" triggerOnce={false} duration={1000} delay={300}> */}
              <form onSubmit={handleSearch} autoComplete="off" className="hero3-search-bar">
                <div className="hero3-field" ref={titleWrapRef}>
                  {/* <label htmlFor="hero3-title-input">Job title</label> */}
                  <div className="hero3-field__input">
                    <FiSearch size={15} className="hero3-field__icon" />
                    <input
                      id="hero3-title-input"
                      type="text"
                      placeholder="e.g. Warehouse Associate"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      onFocus={() => titleSuggestions.length > 0 && setShowTitleDropdown(true)}
                    />
                  </div>
                  {showTitleDropdown && (
                    <ul className="hero3-suggestions">
                      {titleSuggestions.map((t: any) => (
                        <li key={t}>
                          <button
                            type="button"
                            onMouseDown={() => { setTitle(t); setDebouncedTitle(t); setShowTitleDropdown(false); }}
                          >
                            {t}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="hero3-field" ref={locationWrapRef}>
                  {/* <label htmlFor="hero3-location-input">Location</label> */}
                  <div className="hero3-field__input">
                    <FiMapPin size={15} className="hero3-field__icon" />
                    <input
                      id="hero3-location-input"
                      type="text"
                      placeholder="City or province"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      onFocus={() => locationSuggestions.length > 0 && setShowLocationDropdown(true)}
                    />
                  </div>
                  {showLocationDropdown && (
                    <ul className="hero3-suggestions">
                      {locationSuggestions.map((l: any) => (
                        <li key={l}>
                          <button
                            type="button"
                            onMouseDown={() => { setLocation(l); setDebouncedLocation(l); setShowLocationDropdown(false); }}
                          >
                            {l}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="hero3-field">
                  {/* <label htmlFor="hero3-mode-select">Job type</label> */}
                  <div className="hero3-field__input hero3-field__input--select">
                    <FiBriefcase size={15} className="hero3-field__icon" />
                    <select
                      id="hero3-mode-select"
                      value={jobMode}
                      onChange={e => setJobMode(e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                    <FiChevronDown size={13} className="hero3-field__chevron" />
                  </div>
                </div>

                <button type="submit" className="hero3-search-submit d-md-flex d-none" aria-label="Search jobs">
                  <FiSearch size={17} />
                </button>
                <button
                  type="submit"
                  className="thm-btn thm-btn--fill_icon thm-btn--data mt-50 d-md-none d-flex"
                >
                  <div className="xb-item--hidden">
                    <span className="xb-item--hidden-text">
                      Search
                    </span>
                  </div>
                  <div className="xb-item--holder">
                    <span className="xb-item--text xb-item--text1">
                      Search
                    </span>
                    <div className="xb-item--icon">
                      <FiSearch size={17} />
                    </div>
                    <span className="xb-item--text xb-item--text2">
                      Search
                    </span>
                  </div>
                </button>
              </form>
              {/* </Fade> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero3;