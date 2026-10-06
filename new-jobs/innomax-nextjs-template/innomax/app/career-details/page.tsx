'use client';

import React, { Fragment } from 'react';
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
import ApplyForm from './applyForm';

const CareerSingle: React.FC = () => {
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
                      <Image src={icon} alt="icon" /> Careers
                    </span>
                    <h2 className="title">
                      Be a part of shaping the <br />
                      future & career opportunities <br />
                      at Innomax today.
                    </h2>
                  </div>
                </div>
                <div className="col-lg-4 mt-30">
                  <div className="cp-img-slide">
                    <div className="cp-img-inner ul_li">
                      <div className="cp-item marquee-first">
                        {[gImg1, gImg2, gImg3, gImg1, gImg2, gImg3].map((img, i) => (
                          <div className="xb-img" key={`first-${i}`}>
                            <Image src={img} alt="" />
                          </div>
                        ))}
                      </div>
                      <div className="cp-item marquee-2">
                        {[gImg4, gImg5, gImg6, gImg4, gImg5, gImg6].map((img, i) => (
                          <div className="xb-img" key={`second-${i}`}>
                            <Image src={img} alt="" />
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

        <div className="cp-det-bg">
          <section className="career-details">
            <div className="container">
              <div className="cp-details-wrap">
                <div className="cp-manager_info">
                  <h2 className="xb-item--title">Technical project manager - (Full-time)</h2>
                  <ul className="xb-details-content list-unstyled">
                    <li>
                      <span>Department :</span> Technical Project Manager
                    </li>
                    <li>
                      <span>No. of Openings :</span> (3)
                    </li>
                    <li>
                      <span>Job Type :</span> Full-Time
                    </li>
                    <li>
                      <span>Location :</span> Warsaw, Poland
                    </li>
                    <li>
                      <span>Salary :</span> $80k to $100k (Based on your experience)
                    </li>
                    <li>
                      <span>Deadline :</span> December 10, 2024
                    </li>
                    <li>
                      <span>Experience Required :</span> 5+ Years
                    </li>
                  </ul>
                  <p className="xb-item--content">
                    We’re looking for a Technical Project Manager and knowledgeable Product Designer to join our
                    technical team in Warsaw, Poland. You’ll be expected to utilize bleeding-edge technology and robust
                    techniques. You should be an excellent communicator and comfortable managing multiple tasks. You
                    also need to be a team player and have a problem-solving aptitude.
                    <br />
                    <br />
                    Working quickly and creatively should come naturally to you, as well as being an innovative
                    problem-solver who takes pride in producing logical, simple, and effective solutions to what are
                    often very new and complex issues.
                  </p>
                </div>

                <div className="xb-details-item">
                  <h3 className="xb-item--title">What you&apos;ll get to do...</h3>
                  <ul className="xb-details-content">
                    <li>6+ years of previous professional Proficient Project Management experience.</li>
                    <li>
                      <span>Technical Expertise:</span> Solid understanding for effective communication.
                    </li>
                    <li>
                      <span>Stakeholder Management:</span> Track record of ensuring alignment and success.
                    </li>
                    <li>
                      <span>Agile Methodologies:</span> Hands-on experience in Agile frameworks.
                    </li>
                    <li>
                      <span>Risk Management:</span> Skill in identifying and mitigating project risks.
                    </li>
                    <li>
                      <span>Team Leadership:</span> Ability to motivate diverse teams.
                    </li>
                    <li>
                      <span>Communication Skills:</span> Strong ability to convey technical concepts.
                    </li>
                    <li>
                      <span>Problem-Solving:</span> Proactive approach to implement solutions.
                    </li>
                    <li>
                      <span>Quality Assurance:</span> Experience in ensuring deliverable standards.
                    </li>
                  </ul>
                </div>

                <div className="xb-details-item">
                  <h3 className="xb-item--title">You might also have...</h3>
                  <ul className="xb-details-content">
                    <li>Experience with AWS.</li>
                    <li>Experience building CI/CD and server/deployment automation solutions</li>
                    <li>Experience with open-source puppet, infrastructure-as-code.</li>
                    <li>Passion for technology.</li>
                    <li>You have high standards and want to make a difference with your work.</li>
                    <li>You are always trying to improve.</li>
                  </ul>
                </div>

                <div className="xb-details-item">
                  <h3 className="xb-item--title">Great benefits...</h3>
                  <ul className="xb-details-content">
                    <li>Company-wide 401(k) plan.</li>
                    <li>Life & disability insurance offered.</li>
                    <li>Competitive compensation—salary, bonus, equity</li>
                    <li>Medical, dental, and vision; flex spending account.</li>
                    <li>Flexible paid time off & sick leave.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <div className="cp-contact-wrap pt-130 pb-130">
            <div className="container">
              <div className="row">
                <div className="col-lg-12">
                  <ApplyForm />
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

export default CareerSingle;
