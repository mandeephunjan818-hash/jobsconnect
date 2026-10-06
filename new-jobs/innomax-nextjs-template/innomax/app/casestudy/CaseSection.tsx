'use client';

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image, { StaticImageData } from "next/image";

import caseStudies from "../../api/case";

interface CaseStudy {
  id: number;
  title: string;
  slug: string;
  img: StaticImageData;
  category: string;
}

const CaseStudySection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>("*");

  const handleFilter = (category: string) => {
    setActiveFilter(category);
  };

  const filters = [
    { key: "*", label: "View All" },
    { key: "cat1", label: "Development" },
    { key: "cat2", label: "Design" },
    { key: "cat3", label: "Marketing" },
    { key: "cat4", label: "Branding" },
    { key: "cat5", label: "IT Services" },
  ];

  return (
    <section className="casestudy pt-70 pb-130" style={{ backgroundColor: "#f6f6f8" }}>
      <div className="container">
        {/* Filter Buttons */}
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="team-menu casestudy-menu">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  className={activeFilter === filter.key ? "active" : ""}
                  onClick={() => handleFilter(filter.key)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Case Studies Grid */}
        <div className="casestudy-content mt-70">
          <div className="row grid mt-none-30">
            <AnimatePresence>
              {caseStudies
                .filter((item: CaseStudy) => activeFilter === "*" || item.category === activeFilter)
                .map((study: CaseStudy) => (
                  <motion.div
                    key={study.id}
                    className={`col-lg-${study.id === 2 || study.id === 7 ? "8" : study.category === "cat3" ? "8" : "4"} col-md-6 grid-item ${study.category} mt-30`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="casestudy-item">
                      <div className="casestudy-img">
                        <Link href={'/casestudy-details'} passHref>
                          <Image src={study.img} alt={study.title} />
                        </Link>
                        <div className="content_wrap">
                          <h3 className="item_title">{study.title}</h3>
                          <span className="item_tag">{study.slug}</span>
                        </div>
                      </div>
                      <Link href={'/casestudy-details'} passHref>
                        <span className="xb-overlay"></span>
                      </Link>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {/* Load More Button */}
          <div className="text-center xb-btn mt-55">
            <Link href="/casestudy" passHref className="thm-btn thm-btn--aso thm-btn--aso_black">
              Load more case studies
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CaseStudySection;
