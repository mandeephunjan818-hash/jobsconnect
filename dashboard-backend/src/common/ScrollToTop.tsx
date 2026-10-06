"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [showButton, setShowButton] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const topDistance = 600;

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show/hide button
      if (scrollY > topDistance) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }

      // Update scroll progress
      const scrollPercent = (scrollY / (documentHeight - windowHeight)) * 100;
      setScrollProgress(scrollPercent);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      id="scrollTopButton"
      className={`startix-scrolltop ${showButton ? "scrolltop-show" : "scrolltop-hide"}`}
      onClick={scrollToTop}
      style={{ "--scroll-progress": `${scrollProgress}%` } as React.CSSProperties}
    >
      <i className="ti ti-arrow-narrow-up"></i>
    </button>
  );
}