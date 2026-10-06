'use client';

import React, { Fragment } from 'react';
import Link from 'next/link';
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar';
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from '../../public/images/icon/magic.svg';
import gImg1 from '../../public/images/gallery/cp-img01.jpg';
import gImg2 from '../../public/images/gallery/cp-img02.jpg';
import gImg3 from '../../public/images/gallery/cp-img03.jpg';
import gImg4 from '../../public/images/gallery/cp-img04.jpg';
import gImg5 from '../../public/images/gallery/cp-img05.jpg';
import gImg6 from '../../public/images/gallery/cp-img06.jpg';
import Image from 'next/image';

interface Section {
  title: string;
  content: string[];
}

const sections: Section[] = [
  {
    title: 'Copyright and intellectual property usage',
    content: [
      `All content on this website, including text, graphics, logos, and trademarks, is the intellectual property of Innomax...`,
      `Images on this website may include licensed stock photos...`,
    ],
  },
  {
    title: 'Website usage terms',
    content: [
      `By accessing this website, you agree to comply with the following terms...`,
      `Additionally, users must not submit or transmit any unlawful, abusive, defamatory...`,
      `This website may contain links to external sites...`,
    ],
  },
  {
    title: 'Software and services',
    content: [
      `Our services, provided on an "as-is" and "as-available" basis...`,
    ],
  },
  {
    title: 'Personal information policy',
    content: [
      `Innomax adheres to ethical business practices and safeguards your personal information...`,
    ],
  },
  {
    title: 'Disclaimer',
    content: [
      `Information on this website is provided in good faith and sourced from reliable providers...`,
      `Innomax disclaims all warranties, including those related to fitness for a particular purpose...`,
    ],
  },
  {
    title: 'Limitation of liability',
    content: [
      `Innomax disclaims liability for any damages, including lost data or profits...`,
    ],
  },
];

const TermsPage: React.FC = () => {
  return (
    <Fragment>
      <div className="body_wrap sco_agency">
        <Header />

        <section
          className="page-title cp-page-title pt-200 pos-rel bg_img"
          style={{ backgroundImage: `url('/images/bg/page_bg01.jpg')` }}
        >
          <div className="container">
            <div className="page-title-wrap">
              <div className="row mt-none-30 align-items-center">
                <div className="col-lg-8 mt-30">
                  <div className="page-title-box">
                    <span className="sub-title">
                      <Image src={icon} alt="Terms icon" /> Terms & Conditions
                    </span>
                    <h2 className="title">
                      Innomax website terms & <br />
                      conditions your access and <br />
                      usage rights
                    </h2>
                    <span className="page-update_time">Updated on: December 10th, 2024</span>
                  </div>
                </div>
                <div className="col-lg-4 mt-30">
                  <div className="cp-img-slide">
                    <div className="cp-img-inner ul_li">
                      <div className="cp-item marquee-first">
                        {[gImg1, gImg2, gImg3, gImg1, gImg2, gImg3].map((img, i) => (
                          <div className="xb-img" key={`img1-${i}`}>
                            <Image src={img} alt={`Terms visual ${i + 1}`} />
                          </div>
                        ))}
                      </div>
                      <div className="cp-item marquee-2">
                        {[gImg4, gImg5, gImg6, gImg4, gImg5, gImg6].map((img, i) => (
                          <div className="xb-img" key={`img2-${i}`}>
                            <Image src={img} alt={`Terms visual ${i + 7}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="terms-conditions-section cp-det-bg">
          <div className="container">
            <div className="terms-section_inner pt-120 pb-75">
              <div className="row">
                <div className="col-lg-11">
                  {sections.map((section, index) => (
                    <div className="item-details-widget" key={index}>
                      <h2 className="item_details_info_title">{section.title}</h2>
                      {section.content.map((text, idx) => (
                        <p key={idx}>{text}</p>
                      ))}
                    </div>
                  ))}
                  <div className="item-details-widget">
                    <h2 className="item_details_info_title">Contact</h2>
                    <p>
                      <Link href="/contact" className="details-link">
                        Click here
                      </Link>{' '}
                      to contact us regarding this Terms & Conditions or other related issues. You can also send us an e-mail on:{' '}
                      <a href="mailto:contact@innomax.com">contact@innomax.com</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <CtaSection cClass="bg" />
      </div>
      <Footer />
      <Scrollbar />
    </Fragment>
  );
};

export default TermsPage;
