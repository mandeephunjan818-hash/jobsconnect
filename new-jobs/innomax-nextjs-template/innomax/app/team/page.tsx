import React, { Fragment } from 'react';
import Link from 'next/link'
import Teams from '../../api/team'
import Header from '../../components/header/Header';
import Scrollbar from '../../components/scrollbar/scrollbar'
import Footer from '../../components/footer/Footer';
import CtaSection from '../../components/CtaSection/CtaSection';
import icon from '../../public/images/icon/cap.svg'
import bg from '../../public/images/team/team-bg.jpg'
import WorkSection from './work';
import Image from 'next/image';

const TeamPage = () => {
    return (
        <Fragment>
            <div className='body_wrap sco_agency'>
                <Header />
                <section className="page-title pt-200 pos-rel bg_img" style={{ backgroundImage: `url(${'/images/bg/page_bg01.jpg'})` }}>
                    <div className="container">
                        <div className="page-title-wrap">
                            <div className="row mt-none-30 align-items-end">
                                <div className="col-lg-7 mt-30">
                                    <div className="page-title-box">
                                        <span className="sub-title"><Image src={icon} alt="" />Our team</span>
                                        <h2 className="title">Meet the talented SEO team driving innovation, expertise, and your digital success</h2>
                                    </div>
                                </div>
                                <div className="col-lg-5 mt-30">
                                    <div className="count-box">
                                        <h2 className="number">12 <span className="suffix">+</span></h2>
                                        <span className="text">Professional Team <br /> Members</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="team pt-55 pb-130">
                    <div className="container">
                        <div className="row mt-none-30">
                            {Teams.map((team, tsm) => (
                                <div className="col-xl-4 col-lg-6 col-md-6 mt-30" key={tsm}>
                                    <div className="team-item">
                                        <div className="xb-item--content pos-rel">
                                            <div className="xb-item--img">
                                                <Image src={bg} alt="" />
                                            </div>
                                            <div className="xb-item--item">
                                                <span className="xb-item--skill">{team.exprience}</span>
                                                <span className="xb-item--reating"><i className="fas fa-star"></i> {team.rating}</span>
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
                                                    <Link href="/team" aria-label="LinkedIn">
                                                        <i className="fab fa-linkedin-in"></i>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link href="/team" aria-label="Custom Icon">
                                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M10.6883 7.62176L17.2244 0H15.6756L10.0002 6.61789L5.46738 0H0.239258L7.09382 10.0074L0.239258 18H1.7882L7.7815 11.0113L12.5685 18H17.7967L10.6879 7.62176H10.6883ZM2.3463 1.16972H4.72537L15.6763 16.8835H13.2972L2.3463 1.16972Z" fill="#111112" />
                                                        </svg>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                <WorkSection />
                <CtaSection />
            </div>
            <Footer />
            <Scrollbar />
        </Fragment>
    )
};

export default TeamPage;
