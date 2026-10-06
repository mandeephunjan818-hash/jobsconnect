'use client';

import React from 'react';
import Project from '../../../api/project';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { Fade } from 'react-awesome-reveal';
import Image from 'next/image';

interface ProjectType {
  slug: string;
  title: string;
  description: string;
  rtext1?: string;
  rtext2?: string;
  rtext3?: string;
  icon?: any;
  pImg: any;
}

const ProjectSection: React.FC = () => {
  return (
    <section className="project pb-140 o-hidden">
      <div className="container">
        <div className="pro-top ul_li_between mb-65">
          <div className="sec-title">
            <Fade direction="up" triggerOnce duration={1000} delay={9}>
              <div>
                <h2 className="title mb-15">Recent works</h2>
              </div>
            </Fade>
            <Fade direction="up" triggerOnce duration={1000} delay={9}>
              <div>
                <span className="content">Recent Works showcases our latest projects.</span>
              </div>
            </Fade>
          </div>
          <div className="xb-btn text-center mb-30">
            <Fade direction="right" triggerOnce duration={1000} delay={9}>
              <div>
                <Link href="/casestudy" className="thm-btn thm-btn--fill_icon thm-btn--strock">
                  <div className="xb-item--hidden">
                    <span className="xb-item--hidden-text">Get started now</span>
                  </div>
                  <div className="xb-item--holder">
                    <span className="xb-item--text">View all case study</span>
                    <div className="xb-item--icon">
                      <i className="far fa-long-arrow-right"></i>
                    </div>
                    <span className="xb-item--text">View all case study</span>
                  </div>
                </Link>
              </div>
            </Fade>
          </div>
        </div>
      </div>

      <div className="project-wrapper pos-rel">
        <div className="project-slider">
          <Swiper
            modules={[Pagination, Autoplay]}
            loop
            spaceBetween={60}
            speed={400}
            slidesPerView={3}
            centeredSlides
            autoplay={{
              delay: 6000,
              disableOnInteraction: false,
            }}
            pagination={{
              el: '.swiper-pagination',
              clickable: true,
            }}
            breakpoints={{
              1600: { slidesPerView: 3 },
              1024: { slidesPerView: 1 },
              768: { slidesPerView: 1 },
              576: { slidesPerView: 1 },
              0: { slidesPerView: 1 },
            }}
          >
            {Project.slice(4, 9).map((project: ProjectType, prj: number) => (
              <SwiperSlide key={prj}>
                <div className="project-item">
                  <div className="xb-item--inner ul_li align-items-start">
                    <div className="xb-item--left_item">
                      {project.icon && (
                        <div className="xb-item--icon">
                          <Image src={project.icon} alt={`${project.title} icon`} />
                        </div>
                      )}
                      <h3 className="xb-item--title">
                        <Link href={`/portfolio_details/${project.slug}`}>{project.title}</Link>
                      </h3>
                      <p className="xb-item--content">{project.description}</p>

                      <ul className="category list-unstyled ul_li">
                        {project.rtext1 && (
                          <li>
                            <Link href={`/portfolio_details/${project.slug}`}>{project.rtext1}</Link>
                          </li>
                        )}
                        {project.rtext2 && (
                          <li>
                            <Link href={`/portfolio_details/${project.slug}`}>{project.rtext2}</Link>
                          </li>
                        )}
                        {project.rtext3 && (
                          <li>
                            <Link href={`/portfolio_details/${project.slug}`}>{project.rtext3}</Link>
                          </li>
                        )}
                      </ul>

                      <div className="work-btn">
                        <Link
                          href={`/portfolio_details/${project.slug}`}
                          className="thm-btn thm-btn--fill_icon thm-btn--strock"
                        >
                          <div className="xb-item--hidden">
                            <span className="xb-item--hidden-text">View case study</span>
                          </div>
                          <div className="xb-item--holder">
                            <span className="xb-item--text">View case study</span>
                            <div className="xb-item--icon">
                              <i className="far fa-long-arrow-right"></i>
                            </div>
                            <span className="xb-item--text">View case study</span>
                          </div>
                        </Link>
                      </div>
                    </div>

                    <div className="xb-item--right_img">
                      <Link href={`/portfolio_details/${project.slug}`}>
                        <Image src={project.pImg} alt={`${project.title} image`} />
                      </Link>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
            <div className="swiper-pagination"></div>
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default ProjectSection;
