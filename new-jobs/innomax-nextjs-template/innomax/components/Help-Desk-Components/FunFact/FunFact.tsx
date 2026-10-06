'use client';

import React from 'react'
import CountUp from 'react-countup';
import sIcon1 from '../../../public/images/icon/chart-icon02.png'
import sIcon2 from '../../../public/images/icon/receipt-icon.png'
import sIcon3 from '../../../public/images/icon/wallet.png';
import Image from 'next/image';

const FunFactSection = () => {
    return (
        <section className="fanfact pb-130">
            <div className="container">
                <div className="fanfact-wrap ul_li_between mt-none-30">
                    <div className="xb-fanfact-item wow fadeInLeft" data-wow-delay="000ms" data-wow-duration="600ms">
                        <div className="xb-item--holder mb-25 ul_li_between">
                            <h2 className="xb-item--number">
                                <CountUp end={286} duration={2.5} separator="," enableScrollSpy />%
                            </h2>
                            <span><Image src={sIcon1} alt="Chart Icon" /></span>
                        </div>
                        <p className="xb-item--content">
                            Average ROI customers have achieved <br /> over a three-year period.
                        </p>
                    </div>

                    <div className="xb-fanfact-item xb-fanfact-item--two wow fadeInLeft" data-wow-delay="150ms" data-wow-duration="600ms">
                        <div className="xb-item--holder mb-25 ul_li_between">
                            <h2 className="xb-item--number">
                                <CountUp end={10} duration={2.5} enableScrollSpy /> Months
                            </h2>
                            <span><Image src={sIcon2} alt="Receipt Icon" /></span>
                        </div>
                        <p className="xb-item--content">
                            Time it took for customers to achieve <br /> full payback on their investment.
                        </p>
                    </div>

                    <div className="xb-fanfact-item xb-fanfact-item--three wow fadeInLeft" data-wow-delay="300ms" data-wow-duration="600ms">
                        <div className="xb-item--holder mb-25 ul_li_between">
                            <h2 className="xb-item--number">
                                $<CountUp end={20} duration={2.5} enableScrollSpy />M
                            </h2>
                            <span><Image src={sIcon3} alt="Wallet Icon" /></span>
                        </div>
                        <p className="xb-item--content">
                            Customer Net Present Value Over <br /> a Three-Year Timespan
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default FunFactSection;
