'use client';

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Fade } from "react-awesome-reveal";
import cIcon1 from '../../public/images/icon/cp-icon.svg';
import cIcon2 from '../../public/images/icon/loc-icon.svg';
import cIcon3 from '../../public/images/icon/clock-icon.svg';
import Image from "next/image";

type Job = {
  id: number;
  title: string;
  location: string;
  type: string;
  slug: string;
  categories: string[];
};

const jobListings: Job[] = [
  {
    id: 1,
    title: "Enterprise SEO Consultant",
    location: "Remote, (USA)",
    type: "Full time",
    slug: "enterprise-seo-consultant",
    categories: ["cat1", "cat3", "cat5"],
  },
  {
    id: 2,
    title: "IT Infrastructure Manager",
    location: "Remote, Colombia",
    type: "Full time",
    slug: "it-infrastructure-manager",
    categories: ["cat2", "cat4"],
  },
  {
    id: 3,
    title: "Technical Project Manager",
    location: "Warsaw, Poland",
    type: "Full time",
    slug: "technical-project-manager",
    categories: ["cat1", "cat5"],
  },
  {
    id: 4,
    title: "Cloud Solutions Architect",
    location: "Bangalore (Hybrid)",
    type: "Full time",
    slug: "cloud-solutions-architect",
    categories: ["cat2", "cat3"],
  },
  {
    id: 5,
    title: "IT Support Engineer",
    location: "Remote, Argentina",
    type: "Full time",
    slug: "it-support-engineer",
    categories: ["cat1", "cat4"],
  },
  {
    id: 6,
    title: "Global Benefits Manager",
    location: "Remote, Canada",
    type: "Full time",
    slug: "global-benefits-manager",
    categories: ["cat2", "cat3", "cat5"],
  },
];

const CareerTeam: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>("*");

  const handleFilter = (category: string) => {
    setActiveFilter(category);
  };

  const filters = [
    { key: "*", label: "View All" },
    { key: "cat1", label: "Development" },
    { key: "cat2", label: "Design" },
    { key: "cat3", label: "Marketing" },
    { key: "cat4", label: "Customer Services" },
    { key: "cat5", label: "Management" },
  ];

  const scrollToTop = () => {
    window.scrollTo(0, 0);
  };

  return (
    <section className="team pt-130 pb-130">
      <div className="container">
        <div className="sec-title--two text-center mb-50">
          <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
            <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
              <Image src={cIcon1} alt="icon" />
              Open Positions
            </div>
          </Fade>
          <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
            <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
              Join our team
            </h2>
          </Fade>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-12 text-center">
            <div className="team-menu mb-50">
              {filters.map((filter, index) => (
                <button
                  key={index}
                  className={activeFilter === filter.key ? "active" : ""}
                  onClick={() => handleFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-lg-12">
            <div className="cp-team-wrap grid">
              <AnimatePresence>
                {jobListings
                  .filter(
                    (job) =>
                      activeFilter === "*" || job.categories.includes(activeFilter)
                  )
                  .map((job) => (
                    <motion.div
                      key={job.id}
                      className={`cp-team-item grid-item ${job.categories.join(" ")}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="xb-item--inner ul_li_between">
                        <div className="xb-item--content">
                          <h3 className="xb-item--title">
                            <Link onClick={scrollToTop} href={'/career-details'}>
                              {job.title}
                            </Link>
                          </h3>
                          <div className="xb-item--holder ul_li">
                            <span className="xb-item--meta">
                              <Image src={cIcon2} alt="location" />
                              {job.location}
                            </span>
                            <span className="xb-item--meta">
                              <Image src={cIcon3} alt="time" />
                              {job.type}
                            </span>
                          </div>
                        </div>
                        <div className="cp-team-btn">
                          <Link onClick={scrollToTop} href={'/career-details'} className="cp-btn">
                            View job <i className="fal fa-arrow-right"></i>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerTeam;
