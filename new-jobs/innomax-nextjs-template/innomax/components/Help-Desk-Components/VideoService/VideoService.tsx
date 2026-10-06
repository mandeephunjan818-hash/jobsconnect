'use client';

import React, { useState } from 'react';
import Link from "next/link";
import { Fade } from "react-awesome-reveal";
import icon from '../../../public/images/icon/video-circle.svg';
import vImg from '../../../public/images/video/img01.png';
import icon1 from '../../../public/images/video/polygon.png';
import icon2 from '../../../public/images/icon/arrow-black.png';
import icon3 from '../../../public/images/shape/line_shape01.png';
import icon4 from '../../../public/images/shape/line-shape02.png';
import Image from 'next/image';

const VideoService: React.FC = () => {
  const [isOpen, setOpen] = useState(false);

  const handleVideoToggle = () => {
    setOpen(!isOpen);
  };

  return (
    <section id="funfact" className="video pt-130 pb-130" style={{ backgroundColor: '#fff' }}>
      <div className="container">
        <div className="video-wrap">
          <div className="sec-title--two sec-title--four text-center mb-65">
            <Fade direction='down' triggerOnce={false} duration={1000} delay={9}>
              <div>
                <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
                  <Image src={icon} alt="Video icon" />How it’s work
                </div>
              </div>
            </Fade>
            <Fade direction='down' triggerOnce={false} duration={1500} delay={9}>
              <div>
                <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">Simplify work innomax</h2>
              </div>
            </Fade>
          </div>
          <div className="xb-video">
            <Image src={vImg} alt="Video thumbnail" />
            <button
              type="button"
              className="popup-video btn-video"
              aria-label="Play video"
              onClick={handleVideoToggle}
            >
              <Image src={icon1} alt="Play icon" />
            </button>
          </div>
          <div className="xb-btn text-center mt-20 wow fadeInUp" data-wow-duration="600ms">
            <Link href="/pricing" className="thm-btn thm-btn--three">
              Start your free trial
              <span>
                <Image className="img--one" src={icon2} alt="Arrow icon" />
                <Image className="img--two" src={icon2} alt="Arrow icon" />
              </span>
            </Link>
          </div>
          <div className="xb-shape">
            <Image className="img img--one xbzoominzoomup" src={icon3} alt="Decorative shape" />
            <Image className="img img--two" data-parallax='{"y" : -100, "x" : 50, "smoothness": 10}' src={icon4} alt="Decorative shape" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoService;
