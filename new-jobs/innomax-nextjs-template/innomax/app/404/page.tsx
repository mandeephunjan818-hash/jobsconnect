import React, { Fragment } from 'react';
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar';
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from '../../public/images/icon/music-icon.svg';
import bImg1 from '../../public/images/hero/contact-img.png';
import bImg2 from '../../public/images/shape/brd_shape.png';
import Image from 'next/image';
import Link from 'next/link';

const ErrorPage: React.FC = () => {
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
                      <Image src={icon} alt="Music Icon" /> 404 Error
                    </span>
                    <h2 className="title">
                      Hi Sorry We Can’t <br /> Find That Page
                    </h2>
                  </div>
                </div>
                <div className="col-lg-3 mt-30">
                  <div className="sd-right-img pos-rel">
                    <Image src={bImg1} alt="Contact Illustration" />
                    <div className="sd-arrow-shape style-3">
                      <Image className="xbzoominzoomup" src={bImg2} alt="Decorative Shape" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="error-page">
          <div className="container not-found-content">
            <div className="row justify-content-center">
              <div className="col-lg-12">
                <div className="contant-wrapper text-center">
                  <div className="error-page__text">
                    <h2>404</h2>
                  </div>
                  <div className="error-page__content mb-50">
                    <h2>Hi Sorry We Can’t Find That Page!</h2>
                    <p>
                      Oops! The page you are looking for does not exist. It might have been moved or deleted.
                    </p>

                    <div className="error-page-button">
                      <Link href="/" className="thm-btn thm-btn--aso thm-btn--aso_yellow">
                        <span className="btn_label" data-text="Go Back Home">
                          Go Back Home
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CtaSection />
      </div>
      <Footer />
      <Scrollbar />
    </Fragment>
  );
};

export default ErrorPage;
