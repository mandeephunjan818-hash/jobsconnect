import React, { Fragment, FC } from 'react';
import CaseStudySection from './CaseSection';
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar';
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from '../../public/images/icon/eye-icon.svg';
import sImg1 from '../../public/images/hero/cd-img02.png';
import sImg2 from '../../public/images/shape/brd_shape.png';
import Image from 'next/image';

interface CaseStudySingleProps {}

const CaseStudySingle: FC<CaseStudySingleProps> = () => {
  return (
    <Fragment>
      <div className="body_wrap sco_agency">
        <Header />
        <section
          className="page-title pt-200 pos-rel bg_img"
          style={{ backgroundImage: `url('/images/bg/page_bg01.jpg')` }}
        >
          <div className="container">
            <div className="page-title-wrap sd-title-wrap">
              <div className="row mt-none-30 align-items-end">
                <div className="col-lg-9 mt-30">
                  <div className="page-title-box">
                    <span className="sub-title">
                      <Image src={icon} alt="" /> Casestudy details
                    </span>
                    <h2 className="title">
                      Discover our case studies <br /> highlighting transformative <br /> SEO and IT
                      solutions
                    </h2>
                  </div>
                </div>
                <div className="col-lg-3 mt-30">
                  <div className="sd-right-img pos-rel">
                    <Image src={sImg1} alt="" />
                    <div className="sd-arrow-shape style-2">
                      <Image className="xbzoominzoomup" src={sImg2} alt="" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <CaseStudySection />
        <CtaSection />
      </div>
      <Footer />
      <Scrollbar />
    </Fragment>
  );
};

export default CaseStudySingle;
