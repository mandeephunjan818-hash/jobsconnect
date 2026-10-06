import React from 'react';
import CountUp from 'react-countup';
import sIcon1 from '../../public/images/icon/c_01.svg';
import sIcon2 from '../../public/images/icon/c_02.svg';
import sIcon3 from '../../public/images/icon/c_03.svg';
import sIcon4 from '../../public/images/icon/c_04.svg';
import Bg from '../../public/images/bg/counter_bg.jpg';
import Image from 'next/image';

interface FunFactItem {
  title: number | string;
  subTitle: string;
  symbol: string;
  icon: string;
  style?: string;
}

const FunFact: FunFactItem[] = [
  {
    title: 20,
    subTitle: 'Visa Categories',
    symbol: '+',
    icon: sIcon1,
  },
  {
    title: 30,
    subTitle: 'Visa Process',
    symbol: 'K+',
    icon: sIcon2,
    style: 'style-2',
  },
  {
    title: 40,
    subTitle: 'Successful Project',
    symbol: 'K+',
    icon: sIcon3,
    style: 'style-3',
  },
  {
    title: 180,
    subTitle: 'Pro Consultants',
    symbol: 'K+',
    icon: sIcon4,
    style: 'style-4',
  },
];

const FunFactSection: React.FC = () => {
  return (
    <section
      className="counter pt-120 pb-120 bg_img"
      style={{ backgroundImage: `url(${Bg.src})` }}
    >
      <div className="container">
        <div className="sec-title mb-45">
          <h2 className="mb-40 wow skewIn">
            Discovering Our Biggest Successes: The Stories <br />
            <span> Behind Our Great Achievements</span>
          </h2>
          <p>
            Embarking on a journey to reunite families, we recently had the privilege of assisting a <br />
            couple in securing their spouse&apos;s visa.
          </p>
        </div>
        <div className="row">
          <div className="col-lg-12">
            <div className="xb-counter ul_li">
              {FunFact.map((funfact, idx) => (
                <div className={`xb-item--item ul_li ${funfact.style ?? ''}`} key={idx}>
                  <div className="xb-item--icon">
                    <Image src={funfact.icon} alt={funfact.subTitle} />
                  </div>
                  <div className="xb-item--holder">
                    <h2 className="xb-item--number">
                      <span className="xbo">
                        <CountUp end={Number(funfact.title)} enableScrollSpy />
                      </span>
                      <span className="suffix">{funfact.symbol}</span>
                    </h2>
                    <h5 className="xb-item--title">{funfact.subTitle}</h5>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FunFactSection;
