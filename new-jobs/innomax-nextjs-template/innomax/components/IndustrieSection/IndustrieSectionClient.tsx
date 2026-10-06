"use client";

import React from "react";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";
import hicon from "../../public/images/icon/building.svg";

// ── The exact 10 imported icons from the original component ──
import sIcon1 from "../../public/images/industrie/img01.png";
import sIcon2 from "../../public/images/industrie/img02.png";
import sIcon3 from "../../public/images/industrie/img03.png";
import sIcon4 from "../../public/images/industrie/img04.png";
import sIcon5 from "../../public/images/industrie/img05.png";
import sIcon6 from "../../public/images/industrie/img06.png";
import sIcon7 from "../../public/images/industrie/img07.png";
import sIcon8 from "../../public/images/industrie/img08.png";
import sIcon9 from "../../public/images/industrie/img09.png";
import sIcon10 from "../../public/images/industrie/img10.png";

import type { CategoryItem } from "../../app/actions/categoryAction";

// ── Icon map (by name) + fallback array for cycling ──
const iconByName: Record<string, typeof sIcon1> = {
  SaaS: sIcon1,
  Lawyers: sIcon2,
  "Real estate": sIcon3,
  Insurance: sIcon4,
  Crypto: sIcon5,
  "Private equity": sIcon6,
  Education: sIcon7,
  Finance: sIcon8,
  Healthcare: sIcon9,
  Automotive: sIcon10,
};

const iconArray = [
  sIcon1, sIcon2, sIcon3, sIcon4, sIcon5,
  sIcon6, sIcon7, sIcon8, sIcon9, sIcon10,
];

// Fallback data – each item still uses its own correct icon through the map
const FALLBACK: CategoryItem[] = [
  { name: "SaaS", imageUrl: sIcon1.src, count: 45, order: 1, link: "/jobs" },
  { name: "Lawyers", imageUrl: sIcon2.src, count: 23, order: 2, link: "/jobs" },
  { name: "Real estate", imageUrl: sIcon3.src, count: 67, order: 3, link: "/jobs" },
  { name: "Insurance", imageUrl: sIcon4.src, count: 12, order: 4, link: "/jobs" },
  { name: "Crypto", imageUrl: sIcon5.src, count: 30, order: 5, link: "/jobs" },
  { name: "Private equity", imageUrl: sIcon6.src, count: 8, order: 6, link: "/jobs" },
  { name: "Education", imageUrl: sIcon7.src, count: 55, order: 7, link: "/jobs" },
  { name: "Finance", imageUrl: sIcon8.src, count: 41, order: 8, link: "/jobs" },
  { name: "Healthcare", imageUrl: sIcon9.src, count: 36, order: 9, link: "/jobs" },
  { name: "Automotive", imageUrl: sIcon10.src, count: 19, order: 10, link: "/jobs" },
];

interface Props {
  categories: CategoryItem[];
}

const CategorySectionClient: React.FC<Props> = ({ categories }) => {
  const items = categories.length > 0 ? categories : FALLBACK;

  return (
    <section className="industrie pb-150 pt-150">
      <div className="industrie-wrap sec-bg pos-rel">
        <div className="container">
          <div className="sec-title--two text-center mb-30">
            {/* <Fade direction="down" triggerOnce={false} duration={500} delay={3}> */}
              <div>
                <div className="sub-title wow fadeInDown tm-badge" data-wow-duration="600ms">
                  <Image src={hicon} alt="icon" /> Job Categories
                </div>
              </div>
            {/* </Fade> */}
            {/* <Fade direction="up" triggerOnce={false} duration={600} delay={3}> */}
              <div>
                <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                  Explore top hiring categories
                </h2>
              </div>
            {/* </Fade> */}
          </div>

          <div className="row row-cols-xl-5 gap-4 row-cols-md-3 row-cols-sm-2 row-cols-1 mx-auto justify-content-center industrie-slider">
            {items.map((cat, i) => {
              // Pick icon by name, or cycle through the array based on index
              const icon = iconByName[cat.name] || iconArray[i % iconArray.length];
              return (
                // <Fade direction="up" triggerOnce={false} duration={800} delay={3}>
                  <div className="col px-0 mx-0" key={cat.name || i}>
                    {/* h-100 forces equal height inside the column */}
                    <div className="indus-item h-100">
                      <div className="xb-img">
                        <Image src={icon} alt={cat.name} />
                      </div>
                      <h3 className="xb-title">{cat.name}</h3>
                    </div>
                  </div>
                // {/* </Fade> */}
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategorySectionClient;