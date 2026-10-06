"use client";

import React, { useEffect, useRef } from "react";
import Image, { StaticImageData } from "next/image";

import pimg1 from "../../../public/images/brand/cs-brd01.png";
import pimg2 from "../../../public/images/brand/cs-brd02.png";
import pimg3 from "../../../public/images/brand/cs-brd03.png";
import pimg4 from "../../../public/images/brand/cs-brd04.png";
import pimg5 from "../../../public/images/brand/cs-brd05.png";
import pimg6 from "../../../public/images/brand/cs-brd06.png";
import pimg7 from "../../../public/images/brand/cs-brd07.png";
import pimg8 from "../../../public/images/brand/cs-brd08.png";
import pimg9 from "../../../public/images/brand/cs-brd09.png";
import pimg10 from "../../../public/images/brand/cs-brd10.png";
import pimg11 from "../../../public/images/brand/cs-brd11.png";
import pimg12 from "../../../public/images/brand/cs-brd12.png";
import pimg13 from "../../../public/images/brand/cs-brd13.png";
import pimg14 from "../../../public/images/brand/cs-brd14.png";
import pimg15 from "../../../public/images/brand/cs-brd15.png";
import pimg16 from "../../../public/images/brand/cs-brd16.png";
import pimg17 from "../../../public/images/brand/cs-brd17.png";
import pimg18 from "../../../public/images/brand/cs-brd18.png";

interface Partner {
  pImg: StaticImageData;
}

const partnersLeft: Partner[] = [
  { pImg: pimg1 },
  { pImg: pimg2 },
  { pImg: pimg3 },
  { pImg: pimg4 },
  { pImg: pimg5 },
  { pImg: pimg6 },
  { pImg: pimg7 },
  { pImg: pimg8 },
  { pImg: pimg9 },
];

const partnersRight: Partner[] = [
  { pImg: pimg10 },
  { pImg: pimg11 },
  { pImg: pimg12 },
  { pImg: pimg13 },
  { pImg: pimg14 },
  { pImg: pimg15 },
  { pImg: pimg16 },
  { pImg: pimg17 },
  { pImg: pimg18 },
  { pImg: pimg10 },
  { pImg: pimg11 },
  { pImg: pimg12 },
  { pImg: pimg13 },
  { pImg: pimg14 },
  { pImg: pimg15 },
  { pImg: pimg16 },
  { pImg: pimg17 },
  { pImg: pimg18 },
];

const PartnerSection: React.FC = () => {
  const marqueeLeftRef = useRef<HTMLDivElement | null>(null);
  const marqueeRightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const animateMarquee = (marqueeRef: React.RefObject<HTMLDivElement>) => {
      const marquee = marqueeRef.current;
      if (!marquee) return;

      const speed = 0.2; // Adjust speed here
      let offset = 0;

      const marqueeContent = marquee.querySelector<HTMLDivElement>(".da-brand_marquee");
      if (!marqueeContent) return;

      // Duplicate content for infinite scroll effect
      marqueeContent.insertAdjacentHTML("beforeend", marqueeContent.innerHTML);

      const moveMarquee = () => {
        offset -= speed;
        marqueeContent.style.transform = `translateX(${offset}px)`;

        const totalWidth = marqueeContent.scrollWidth / 2;
        if (Math.abs(offset) >= totalWidth) {
          offset = 0;
        }

        requestAnimationFrame(moveMarquee);
      };

      moveMarquee();
    };

    animateMarquee(marqueeLeftRef);
    animateMarquee(marqueeRightRef);
  }, []);

  return (
    <section className="brand mt-90">
      <div className="cs-brand_wrap pt-60 pb-60 pos-rel">
        {/* Marquee Left */}
        <div className="cs-brand-inner marquee-left" ref={marqueeLeftRef}>
          <div className="da-brand_marquee">
            {partnersLeft.map((partner, index) => (
              <div className="cs-brand-item" key={index}>
                <div className="xb-inner">
                  <div className="xb-img">
                    <Image src={partner.pImg} alt={`Brand ${index + 1}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marquee Right */}
        <div className="cs-brand-inner marquee-right" ref={marqueeRightRef}>
          <div className="da-brand_marquee">
            {partnersRight.map((partner, index) => (
              <div className="cs-brand-item" key={index}>
                <div className="xb-inner">
                  <div className="xb-img">
                    <Image src={partner.pImg} alt={`Brand ${index + 20}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cs-brand_content">
          <div className="xb-holder">
            <span className="sub-title">
              <span data-parallax='{"x":50,"y":70}'>
                <span className="sub-title--inner">
                  <span>Effective service</span>
                </span>
                <svg
                  width="19"
                  height="18"
                  viewBox="0 0 19 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.4871 16.9645C18.7081 17.5684 18.1337 18.1603 17.5235 17.9576L1.04049 12.4812C0.386752 12.264 0.32721 11.3626 0.946757 11.0613L7.10885 8.06472C7.6312 7.81065 8.0478 7.38145 8.28597 6.85171L11.0963 0.602306C11.3788 -0.0259072 12.2816 0.00653915 12.5183 0.653458L18.4871 16.9645Z"
                    fill="#F65A0B"
                  />
                </svg>
              </span>
            </span>
            <h2 className="title">
              {" "}
              <span>300K clients</span> worldwide
            </h2>
            <span className="sub-title sub-title--two">
              <span data-parallax='{"x":-50,"y":-70}'>
                <svg
                  width="19"
                  height="18"
                  viewBox="0 0 19 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0.779727 1.06017C0.567847 0.453069 1.15106 -0.130154 1.75818 0.0817293L18.1571 5.80495C18.8075 6.03193 18.8535 6.93416 18.2295 7.22609L12.0231 10.1298C11.497 10.376 11.074 10.7989 10.8279 11.325L7.92409 17.5315C7.63216 18.1554 6.72993 18.1094 6.50295 17.459L0.779727 1.06017Z"
                    fill="#E2EA46"
                  />
                </svg>
                <span className="sub-title--inner">
                  <span>Fast security</span>
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerSection;
