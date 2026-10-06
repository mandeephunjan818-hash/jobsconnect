"use client";
import portfolio_data from "@/data/portfolio-data";
import RightArrawWhitIcon from "@/svg/RightArrawWhitIcon";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";


export const portfolio_filters = [
  { label: "All", value: "*" },
  { label: "Business", value: "business" },
  { label: "Consulting", value: "consultancy" },
  { label: "Creative", value: "security" },
];




export default function PortfolioArea() {

  const [activeFilter, setActiveFilter] = useState("*");

  const filteredData = activeFilter === "*"
    ? portfolio_data
    : portfolio_data.filter(item => item.categories.includes(activeFilter));



  return (
    <>
      <div className="luminix-padding-section">
        <div className="container">
          <div className="luminix-section-title center">
            <h2>We're passionate about our work</h2>
            <div className="luminix-portfolio-menu mt-50">
              <ul id="watch-filter-gallery" className="option-set clear-both" data-option-key="filter">
                {portfolio_filters.map((filter, i) => (
                  <li
                    key={filter.value}
                    className={`wow fadeInUpX ${activeFilter === filter.value ? "active" : ""}`}
                    data-wow-delay={`0.${i + 1}s`}
                    onClick={() => setActiveFilter(filter.value)}
                    style={{ cursor: "pointer" }}
                  >
                    {filter.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="row luminix-portfolio-column" id="luminix-portfolio-grid">

            {filteredData.map((item) => (
              <div key={item.id} className={`col-xl-6 col-lg-6 col-md-6 col-sm-6 collection-grid-item ${item.categories.join(" ")}`}>
                <div className="luminix-p-wrap wrap2">
                  <div className="luminix-p-thumb">
                    <Image width={item.width} height={item.height} src={item.image} alt={item.title} />
                    <div className="luminix-p-content">
                      <h5>{item.title}</h5>
                      <div className="luminix-p-btn">
                        <Link href={item.href}>
                          <RightArrawWhitIcon />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}



          </div>
        </div>
      </div>
    </>
  )
}
