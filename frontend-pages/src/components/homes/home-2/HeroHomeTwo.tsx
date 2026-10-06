 

'use client';

import Link from 'next/link';
import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'animate.css';

 

const PrevArrow = (props: { onClick: () => void }) => {
  const { onClick } = props;
  return <button className="slide-arrow luminix-hero-next" onClick={onClick}></button>;
};

const NextArrow = (props: { onClick: () => void }) => {
  const { onClick } = props;
  return <button className="slide-arrow luminix-hero-prev" onClick={onClick}></button>;
};

const settings = {
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: false,
  arrows: true,
  speed: 1000,
  lazyLoad: 'progressive' as const, 
  prevArrow: <PrevArrow onClick={() => console.log('Prev arrow clicked!')} />,
  nextArrow: <NextArrow onClick={() => console.log('Next arrow clicked!')} />,
  
};

export default function HeroHomeTwo() {
  return (
    <div className="luminix-hero-section2 section">
      <Slider {...settings} className="luminix-hero-slider-init">
        {[2, 3, 4, 5].map((n, i) => (
          <div key={i}>
            <div
              className={`luminix-hero-slider-item  luminix-hero-bg${n}`} 
            >
              <div className="container">
                <div className="luminix-hero-content2">
                  <h5 className="animate__animated animate__fadeInUp animate__delay-1s">
                    We empower business strategies
                  </h5>
                  <h1 className="hero-title animate__animated animate__fadeIn animate__delay-2s">
                    {n % 2 === 0 ? 'Your strategic business solution partner' : 'Grow & manage your business'}
                  </h1>
                  <p className="text animate__animated animate__fadeInUp animate__delay-3s">
                    We provide tailored business strategies and solutions to address your challenges, fostering sustainable growth and long-term success. With a passion for precision, efficiency and commitment to quality.
                  </p>
                  <div className="mt-50 hero-btn animate__animated animate__fadeInUp animate__delay-4s">
                    <Link href="/contact-us" className="luminix-default-btn pill luminix-hero-btn2">Free Consultation</Link>
                    <Link href="/contact-us" className="luminix-default-btn pill luminix-hero-btn3">Discover More</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}


