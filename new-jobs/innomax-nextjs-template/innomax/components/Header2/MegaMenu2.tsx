import React from 'react'
import Link from "next/link";
import mImg from '../../public/images/casestudy/mm_img.png'
import Image from 'next/image';

const MegaMenu2 = () => {

    return (
        <ul className="submenu">
            <li>
                <div className="mega_menu_wrapper">
                    <div className="container">
                        <div className="mega_menu_wrapper_inner megamenu_widget_wrapper">
                            <div className="row justify-content-lg-between">
                                <div className="col-xl-8">
                                    <div className="megamenu_widget_inner">
                                        <div className="row">
                                            <div className="col-xl-6">
                                                <div className="megamenu_widget">
                                                    <ul
                                                        className="icon_list unordered_list_block">
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">International
                                                                    SEO</span>
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Niche
                                                                    research</span>
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Link
                                                                    building </span>
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Enterprise
                                                                    SEO</span>
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="col-xl-6">
                                                <div className="megamenu_widget">
                                                    <ul
                                                        className="icon_list unordered_list_block">
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Penalty
                                                                    recovery</span>
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Content
                                                                    optimization</span>
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Technical
                                                                    SEO</span>
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="/service-single">
                                                                <span
                                                                    className="icon_list_text">Competitor
                                                                    analysis</span>
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="social_area">
                                        <div className="social_inner ul_li">
                                            <h5>Follow Us:</h5>
                                            <ul
                                                className="social_icons_block unordered_list">
                                                <li>
                                                    <Link href="/">
                                                        <i
                                                            className="fab fa-facebook-f"></i>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link href="/">
                                                        <i
                                                            className="fab fa-linkedin-in"></i>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link href="/">
                                                        <svg width="18" height="18"
                                                            viewBox="0 0 18 18"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg">
                                                            <path
                                                                d="M10.6774 7.62177L17.2342 0H15.6805L9.98719 6.61788L5.43998 0H0.195312L7.07159 10.0074L0.195312 18H1.74916L7.76141 11.0113L12.5636 18H17.8083L10.677 7.62177H10.6774ZM8.54921 10.0956L7.8525 9.09906L2.30903 1.16971H4.69564L9.16929 7.56895L9.866 8.56546L15.6812 16.8835H13.2946L8.54921 10.096V10.0956Z"
                                                                fill="#0C111D" />
                                                        </svg>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link href="/">
                                                        <i className="fab fa-dribbble"></i>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                        <p className="career_link m-0">Looking for new
                                            career? <Link href="/career">We’re
                                                Hiring</Link></p>
                                    </div>
                                </div>
                                <div className="col-xl-3">
                                    <div className="megamenu_case">
                                        <h3>Software</h3>
                                        <h4>Madical SEO success..</h4>
                                        <Image src={mImg} alt="" />
                                        <Link className="megamenu_btn" href="/casestudy">
                                            <span className="btn_label">Read
                                                casestudy</span>
                                            <span className="btn_icon">
                                                <svg width="13" height="13"
                                                    viewBox="0 0 13 13" fill="none"
                                                    xmlns="http://www.w3.org/2000/svg">
                                                    <path
                                                        d="M13 1C13 0.447715 12.5523 2.00008e-07 12 -5.28728e-08L3 7.47917e-07C2.44771 4.10743e-07 2 0.447716 2 1C2 1.55228 2.44772 2 3 2L11 2L11 10C11 10.5523 11.4477 11 12 11C12.5523 11 13 10.5523 13 10L13 1ZM1.70711 12.7071L12.7071 1.70711L11.2929 0.292894L0.292893 11.2929L1.70711 12.7071Z"
                                                        fill="white" />
                                                </svg>
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </li>
        </ul>
    )
}

export default MegaMenu2;