"use client";

import { useRef, useEffect } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Fade } from "react-awesome-reveal";
import 'swiper/css';
import 'swiper/css/navigation';
import Teams from '../../api/team';
import Link from "next/link";
import Image from 'next/image';

import bg from '../../public/images/team/team-bg.jpg';
import hicon from '../../public/images/icon/cap.svg';

interface TeamMember {
  tImg: any;
  name: string;
  title: string;
  exprience: string;
  rating: string;
}

const TeamSection: React.FC = () => {
  const prevRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    if (swiperRef.current && prevRef.current && nextRef.current) {
      swiperRef.current.params.navigation.prevEl = prevRef.current;
      swiperRef.current.params.navigation.nextEl = nextRef.current;
      swiperRef.current.navigation.init();
      swiperRef.current.navigation.update();
    }
  }, []);

  return (
    <section className="team pt-140 pb-140">
      <div className="container">
        <div className="sec-title--two text-center mb-60">
          <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
            <div>
              <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
                <Image src={hicon} alt="Cap icon" />Our specialists
              </div>
            </div>
          </Fade>
          <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
            <div>
              <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                Dedicated Professionals
              </h2>
            </div>
          </Fade>
        </div>

        <div className="sa-team pos-rel">
          <div className="team-slider swiper-container">
            <Swiper
              modules={[Navigation]}
              spaceBetween={50}
              slidesPerView={3}
              centeredSlides={true}
              loop={true}
              speed={1800}
              parallax={true}
              onBeforeInit={(swiper) => {
                swiperRef.current = swiper;
              }}
              breakpoints={{
                1600: { slidesPerView: 3 },
                768: { slidesPerView: 2 },
                576: { slidesPerView: 3 },
                0: { slidesPerView: 1 },
              }}
            >
              {Teams.map((team: TeamMember, index: number) => (
                <SwiperSlide key={index}>
                  <div className="team-item">
                    <div className="xb-item--content pos-rel">
                      <div className="xb-item--img">
                        <Image src={bg} alt="Team background" />
                      </div>
                      <div className="xb-item--item">
                        <span className="xb-item--skill">{team.exprience}</span>
                        <span className="xb-item--reating">
                          <i className="fas fa-star"></i> {team.rating}
                        </span>
                      </div>
                    </div>
                    <div className="xb-item--inner ul_li_between align-items-end">
                      <div className="xb-item--holder">
                        <div className="xb-item--avatar">
                          <Image src={team.tImg} alt={team.name} />
                        </div>
                        <div className="xb-item--author">
                          <h3 className="xb-item--name">{team.name}</h3>
                          <span className="xb-item--desig">{team.title}</span>
                        </div>
                      </div>
                      <ul className="xb-item--social-link ul_li">
                        <li>
                          <Link href="/team">
                            <i className="fab fa-linkedin-in"></i>
                          </Link>
                        </li>
                        <li>
                          <Link href="/team">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path
                                d="M10.6883 7.62176L17.2244 0H15.6756L10.0002 6.61789L5.46738 0H0.239258L7.09382 10.0074L0.239258 18H1.7882L7.7815 11.0113L12.5685 18H17.7967L10.6879 7.62176H10.6883ZM2.3463 1.16972H4.72537L15.6763 16.8835H13.2972L2.3463 1.16972Z"
                                fill="#111112"
                              />
                            </svg>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <div className="team-btn">
            <div className="sa-swiper-btn swiper-button-prev" ref={prevRef}>
              <i className="fal fa-angle-left"></i>
            </div>
            <div className="sa-swiper-btn active swiper-button-next" ref={nextRef}>
              <i className="fal fa-angle-right"></i>
            </div>
          </div>

          <div className="xb-btn text-center mt-50 wow fadeInUp" data-wow-duration="600ms">
            <Link href="/team" className="thm-btn thm-btn--aso">
              Meet our all team member
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
