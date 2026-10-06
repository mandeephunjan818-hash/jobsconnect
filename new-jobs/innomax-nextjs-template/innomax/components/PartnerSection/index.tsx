'use client';

import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image, { StaticImageData } from "next/image";

// Image imports
import pimg1 from '../../public/images/brand/brand-logo01.png';
import pimg2 from '../../public/images/brand/brand-logo02.png';
import pimg3 from '../../public/images/brand/brand-logo03.png';
import pimg4 from '../../public/images/brand/brand-logo04.png';
import pimg5 from '../../public/images/brand/brand-logo05.png';
import pimg6 from '../../public/images/brand/brand-logo06.png';
import pimg7 from '../../public/images/brand/brand-logo05.png';

interface Partner {
  pImg: StaticImageData;
}

const partners: Partner[] = [
  { pImg: pimg1 },
  { pImg: pimg2 },
  { pImg: pimg3 },
  { pImg: pimg4 },
  { pImg: pimg5 },
  { pImg: pimg6 },
  { pImg: pimg7 },
  { pImg: pimg2 },
];

const settings = {
  dots: false,
  infinite: true,
  speed: 5000,
  slidesToShow: 5,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 0,
  cssEase: "linear",
  arrows: false,
  responsive: [
    { breakpoint: 1025, settings: { slidesToShow: 5, slidesToScroll: 1 } },
    { breakpoint: 991, settings: { slidesToShow: 3, slidesToScroll: 1 } },
    { breakpoint: 767, settings: { slidesToShow: 2, slidesToScroll: 1 } },
    { breakpoint: 600, settings: { slidesToShow: 2, slidesToScroll: 1 } },
    { breakpoint: 450, settings: { slidesToShow: 2, slidesToScroll: 1 } },
    { breakpoint: 340, settings: { slidesToShow: 2, slidesToScroll: 1 } },
  ],
};

const PartnerSection: React.FC = () => {
  return (
    <section className="brand pt-30 pb-140">
      <div className="container">
        <div className="o-hidden">
          <div className="brand-sub_title">
            <span>
              Trusted by <b>500+</b> teams to empower <b>2,00,000+</b> people
            </span>
          </div>
          <div className="brand-wrap brand-marquee">
            <Slider {...settings}>
              {partners.map((partner, index) => (
                <div className="brand-logo" key={index}>
                  <Image
                    src={partner.pImg}
                    alt={`Partner logo ${index + 1}`}
                    width={150}
                    height={60}
                    style={{ height: 'auto', width: 'auto', maxWidth: '100%' }}
                  />
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerSection;
