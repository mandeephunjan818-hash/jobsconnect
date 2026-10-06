'use client';

import React from 'react';
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

const PrivacyPage: React.FC = () => {
  return (
    <>
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
                      <Image src={icon} alt="Privacy Icon" /> Privacy Policy
                    </span>
                    <h2 className="title">
                      Innomax website privacy <br />
                      policy your access and <br />
                      usage rights
                    </h2>
                    <span className="page-update_time">Updated on : December 10th, 2024</span>
                  </div>
                </div>
                <div className="col-lg-4 mt-30">
                  <div className="cp-img-slide">
                    <div className="cp-img-inner ul_li">
                      <div className="cp-item marquee-first">
                        {[gImg1, gImg2, gImg3, gImg1, gImg2, gImg3].map((img, i) => (
                          <div className="xb-img" key={`img1-${i}`}>
                            <Image src={img} alt={`Gallery Image ${i + 1}`} />
                          </div>
                        ))}
                      </div>
                      <div className="cp-item marquee-2">
                        {[gImg4, gImg5, gImg6, gImg4, gImg5, gImg6].map((img, i) => (
                          <div className="xb-img" key={`img2-${i}`}>
                            <Image src={img} alt={`Gallery Image ${i + 7}`} />
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
                  {[
                    {
                      title: 'Data controller and data collection',
                      content: [
                        'Innomax is committed to safeguarding your privacy...',
                        'Certain types of data may be necessary to access and utilize specific features...',
                      ],
                    },
                    {
                      title: 'User responsibilities',
                      content: [
                        'Users are responsible for any third-party data shared via the Innomax website...',
                      ],
                    },
                    {
                      title: 'Data processing and security',
                      content: [
                        'Data is processed using secure IT systems at Innomax’s operational offices...',
                      ],
                    },
                    {
                      title: 'Data storage and retention',
                      content: [
                        'Personal data is retained only for as long as necessary...',
                      ],
                    },
                    {
                      title: 'Legal action',
                      content: [
                        'Innomax may disclose personal data to comply with legal obligations...',
                      ],
                    },
                    {
                      title: 'User rights',
                      content: [
                        'Users have the right to access, update, or delete their personal data...',
                      ],
                      list: [
                        'Users can request information about the personal data Innomax holds.',
                        'Correct any inaccurate or incomplete data.',
                        'Request the deletion of their data when it’s no longer needed.',
                        'Request their data in a transferable format.',
                        'Limit the processing of their data in certain situations.',
                        'Object to the processing of their data for direct marketing or legitimate interests.',
                        'Withdraw consent for data processing at any time.',
                        'File a complaint with a supervisory authority if they feel their rights are violated.',
                      ],
                    },
                    {
                      title: "'Do not track' requests",
                      content: [
                        'Innomax does not currently support “Do Not Track” requests...',
                      ],
                    },
                    {
                      title: 'Policy updates',
                      content: [
                        'Innomax may update this Privacy Policy periodically...',
                      ],
                    },
                    {
                      title: 'Retargeting and ad cookies',
                      content: [
                        'Innomax uses cookies for advertising purposes through partners like AdRoll...',
                      ],
                    },
                  ].map((section, i) => (
                    <div className="item-details-widget" key={i}>
                      <h2 className="item_details_info_title">{section.title}</h2>
                      {section.content.map((text, idx) => (
                        <p key={idx}>{text}</p>
                      ))}
                      {section.list && (
                        <ul className="privacy-details">
                          {section.list.map((item, liIdx) => (
                            <li key={liIdx}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                  <div className="item-details-widget">
                    <h2 className="item_details_info_title">Contact</h2>
                    <p>
                      <Link href="/contact" className="details-link">
                        Click here
                      </Link>{' '}
                      to contact us regarding this Privacy Policy or other related issues. You can also send us an e-mail on:{' '}
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
    </>
  );
};

export default PrivacyPage;
