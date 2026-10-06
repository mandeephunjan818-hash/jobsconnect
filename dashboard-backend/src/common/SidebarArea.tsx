"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

interface ProgressItem {
  title: string;
  percentage: number;
}

const progressData: ProgressItem[] = [
  { title: "Software Development", percentage: 80 },
  { title: "Data Integration", percentage: 87 },
  { title: "Analytics Success", percentage: 70 },
];

export default function SidebarArea() {
  const [progress, setProgress] = useState<number[]>(
    progressData.map(() => 0)
  );

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];

    progressData.forEach((item, index) => {
      const increment = item.percentage / 50;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= item.percentage) {
          current = item.percentage;
          clearInterval(interval);
        }
        setProgress((prev) => {
          const newValues = [...prev];
          newValues[index] = Math.round(current);
          return newValues;
        });
      }, 20); // interval speed

      intervals.push(interval);
    });

    return () => intervals.forEach((interval) => clearInterval(interval));
  }, []);

  return (
    <>
      <div
        className="offcanvas offcanvas-end right-side-startix-offcanvas shadow-lg"
        tabIndex={-1}
        id="sideMenuOffcanvas"
      >
        {/* Offcanvas Header */}
        <div className="offcanvas-header">
          <div>
            <Image src="/assets/img/core-img/logo-light.png" alt="" width={800} height={0} className="w-auto h-auto" />
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>

        {/* Offcanvas Body */}
        <div className="offcanvas-body">
          {/* Integration Cards */}
          <div className="d-flex flex-column gap-4">
            {["Instagram", "Adobe XD", "Figma", "Slack", "Facebook", "Google Drive"].map(
              (item, i) => (
                <div key={i} className="integration-card bg-secondary mw-100">
                  <Image src={`/assets/img/partner-img/${6 + i}.png`} alt="" width={80} height={80} className="w-auto h-auto" />
                  <div>
                    <h5>{item}</h5>
                    <p>We must explain to you how these mistaken.</p>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="divider-sm"></div>

          {/* Animated Progress Bars */}
          <div className="d-flex flex-column gap-4">
            {progressData.map((item, i) => {
              const value = progress[i] || 0;
              return (
                <div key={i} className="progress-item">
                  <div className="progress-info mb-2 d-flex justify-content-between align-items-center">
                    <span>{item.title}</span> 
                    <span className="d-flex align-items-center gap-1" style={{ marginRight: `${100 - value}%` }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="11"
                        viewBox="0 0 14 11"
                        fill="none"
                      >
                        <path
                          d="M7.86602 10.5C7.48112 11.1667 6.51887 11.1667 6.13397 10.5L0.93782 1.5C0.55292 0.833332 1.03405 -2.67268e-07 1.80385 -1.9997e-07L12.1962 7.08554e-07C12.966 7.75852e-07 13.4471 0.833334 13.0622 1.5L7.86602 10.5Z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="percentage">{value}%</span>
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar team-progress-bar"
                      role="progressbar"
                      style={{ width: `${value}%`, transition: "width 0.2s linear" }}
                      aria-valuenow={value}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divider-sm"></div>

          {/* Get Started Button */}
          <Link href="/about-us" className="btn btn-primary w-100">
            <span>
              Get Started Now <i className="ti ti-arrow-up-right"></i>
            </span>
            <span>
              Get Started Now <i className="ti ti-arrow-up-right"></i>
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}