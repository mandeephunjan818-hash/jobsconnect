import React from "react";
import Image from "next/image";

import icon from '../../public/images/icon/eye-icon.svg';
import gImg1 from '../../public/images/gallery/img01.jpg';
import gImg2 from '../../public/images/gallery/img02.jpg';
import gImg3 from '../../public/images/gallery/img03.jpg';
import gImg4 from '../../public/images/gallery/img04.jpg';
import gImg5 from '../../public/images/gallery/img05.jpg';
import gImg6 from '../../public/images/gallery/img06.jpg';
import gImg7 from '../../public/images/gallery/img07.jpg';
import gImg8 from '../../public/images/gallery/img08.jpg';
import gImg9 from '../../public/images/gallery/img09.jpg';
import gImg10 from '../../public/images/gallery/img10.jpg';
import gImg11 from '../../public/images/gallery/img11.jpg';

interface GallerySectionProps {
  pClass?: string;
}

const GallerySection: React.FC<GallerySectionProps> = ({ pClass = '' }) => {
  return (
    <section className={`gallery pb-130 ${pClass}`}>
      <div className="container">
        <div className="sec-title--two text-center mb-60">
          <div className="sub-title">
            <Image src={icon} alt="Eye Icon" />
            Our gallery
          </div>
          <h2 className="title">Explore stunning moments</h2>
        </div>
        <div className="gallery-wrap ul_li">
          <div className="gallery-item gallery-item--one">
            <div className="img img--1"><Image src={gImg1} alt="Gallery 1" /></div>
            <div className="img img--2"><Image src={gImg2} alt="Gallery 2" /></div>
            <div className="img img--1"><Image src={gImg3} alt="Gallery 3" /></div>
          </div>
          <div className="gallery-item gallery-item--two">
            <div className="img img--2"><Image src={gImg4} alt="Gallery 4" /></div>
            <div className="img img--1"><Image src={gImg5} alt="Gallery 5" /></div>
          </div>
          <div className="gallery-item gallery-item--three">
            <div className="ul_li_between">
              <div className="img img--3"><Image src={gImg6} alt="Gallery 6" /></div>
              <div className="img img--4"><Image src={gImg7} alt="Gallery 7" /></div>
            </div>
            <div className="img img--4"><Image src={gImg8} alt="Gallery 8" /></div>
          </div>
          <div className="gallery-item gallery-item--four">
            <div className="img img--1"><Image src={gImg9} alt="Gallery 9" /></div>
            <div className="img img--2"><Image src={gImg10} alt="Gallery 10" /></div>
            <div className="img img--5"><Image src={gImg11} alt="Gallery 11" /></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
