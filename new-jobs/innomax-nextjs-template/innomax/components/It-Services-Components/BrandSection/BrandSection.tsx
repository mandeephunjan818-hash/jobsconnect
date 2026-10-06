import React from 'react';
import Link from 'next/link';
import flower from '../../../public/images/icon/flower-icon.svg';
import brand1 from '../../../public/images/brand/logo01.png';
import brand2 from '../../../public/images/brand/logo02.png';
import brand3 from '../../../public/images/brand/logo03.png';
import brand4 from '../../../public/images/brand/logo04.png';
import brand5 from '../../../public/images/brand/logo05.png';
import brand6 from '../../../public/images/brand/logo06.png';
import brand7 from '../../../public/images/brand/logo07.png';
import brand8 from '../../../public/images/brand/logo08.png';
import Image from 'next/image';

const BrandSection: React.FC = () => {
  return (
    <section className="brand pt-135 pb-140" style={{ backgroundColor: "#111112" }}>
      <div className="container">
        <div className="xb-brand-title mb-65">
          <Image src={flower} alt="Decorative flower icon" />
          <span>Brand We Work With</span>
          <Image src={flower} alt="Decorative flower icon" />
        </div>
        <div className="xb-brand-wrap">
          <div className="xb-brand-item">
            <div className="xb-brand-single xb-brand-hover">
              <Link href="/home-2" aria-label="Brand logo 1">
                <Image src={brand1} alt="Brand logo 1" />
              </Link>
              <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
            </div>
            <div className="xb-brand-single xb-brand-hover">
              <Link href="/home-2" aria-label="Brand logo 2">
                <Image src={brand2} alt="Brand logo 2" />
              </Link>
              <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
            </div>
          </div>

          <div className="xb-brand-item xb-brand-item--big xb-brand-hover">
            <Link href="/home-2" aria-label="Brand logo 3">
              <Image src={brand3} alt="Brand logo 3" />
            </Link>
            <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
          </div>

          <div className="xb-brand-item">
            <div className="xb-brand-single xb-brand-hover">
              <Link href="/home-2" aria-label="Brand logo 4">
                <Image src={brand4} alt="Brand logo 4" />
              </Link>
              <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
            </div>
            <div className="xb-brand-single xb-brand-hover">
              <Link href="/home-2" aria-label="Brand logo 5">
                <Image src={brand5} alt="Brand logo 5" />
              </Link>
              <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
            </div>
          </div>

          <div className="xb-brand-item xb-brand-item--big xb-brand-hover">
            <Link href="/home-2" aria-label="Brand logo 6">
              <Image src={brand6} alt="Brand logo 6" />
            </Link>
            <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
          </div>

          <div className="xb-brand-item">
            <div className="xb-brand-single xb-brand-hover">
              <Link href="/home-2" aria-label="Brand logo 7">
                <Image src={brand7} alt="Brand logo 7" />
              </Link>
              <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
            </div>
            <div className="xb-brand-single xb-brand-hover">
              <Link href="/home-2" aria-label="Brand logo 8">
                <Image src={brand8} alt="Brand logo 8" />
              </Link>
              <Link href="/home-2" className="xb-overlay" aria-hidden="true" tabIndex={-1}></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandSection;
