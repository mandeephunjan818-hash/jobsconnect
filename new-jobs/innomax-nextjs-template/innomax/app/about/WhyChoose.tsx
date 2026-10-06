import React from 'react';
import Image from 'next/image';

import sIcon1 from '../../public/images/icon/eye-icon.svg';
import sIcon2 from '../../public/images/feature/ap-feature01.jpg';
import sIcon3 from '../../public/images/feature/ap-feature02.jpg';
import sIcon4 from '../../public/images/feature/ap-feature03.jpg';

interface WhyChooseProps {}

const WhyChoose: React.FC<WhyChooseProps> = () => {
  return (
    <section className="feature pt-130">
      <div className="container">
        <div className="sec-title--two text-center mb-60">
          <div className="sub-title">
            <Image src={sIcon1} alt="Why Choose Icon" />
            Why choose us
          </div>
          <h2 className="title">Customer-Centric Approach</h2>
        </div>
        <div className="row mt-none-30">
          <div className="col-lg-4 col-md-6 mt-30">
            <div className="ap-fea-item pos-rel">
              <div className="xb-item--img">
                <Image src={sIcon2} alt="No empty promises" />
              </div>
              <h3 className="xb-item--content">We don’t make empty promises</h3>
            </div>
          </div>
          <div className="col-lg-4 col-md-6 mt-30">
            <div className="ap-fea-item pos-rel">
              <div className="xb-item--img">
                <Image src={sIcon3} alt="Quick fixes" />
              </div>
              <h3 className="xb-item--content">If something goes wrong, we’ll quickly fix it.</h3>
            </div>
          </div>
          <div className="col-lg-4 col-md-6 mt-30">
            <div className="ap-fea-item pos-rel">
              <div className="xb-item--img">
                <Image src={sIcon4} alt="Custom SEO tools" />
              </div>
              <h3 className="xb-item--content">We created our own SEO tools to fill in the gaps</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
