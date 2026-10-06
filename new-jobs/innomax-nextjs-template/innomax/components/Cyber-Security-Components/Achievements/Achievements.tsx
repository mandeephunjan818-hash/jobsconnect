import React from 'react';
import { Fade } from "react-awesome-reveal";
import Image, { StaticImageData } from 'next/image';

import hicon from '../../../public/images/icon/star02.svg';
import sIcon1 from '../../../public/images/award/img01.png';
import sIcon2 from '../../../public/images/award/img02.png';
import sIcon3 from '../../../public/images/award/img03.png';
import sIcon4 from '../../../public/images/award/img04.png';

interface AwardItem {
  icon: StaticImageData;
  title: string;
  duration: number;
}

const awards: AwardItem[] = [
  {
    icon: sIcon1,
    title: 'Best Network Security 2023',
    duration: 800,
  },
  {
    icon: sIcon2,
    title: 'Cyber Defense Leader 2022',
    duration: 900,
  },
  {
    icon: sIcon3,
    title: 'Data Protection Awards 2020',
    duration: 1000,
  },
  {
    icon: sIcon4,
    title: 'Innovator in Security 2023',
    duration: 1100,
  },
];

const Achievements: React.FC = () => {
  return (
    <section className="award pt-160">
      <div className="container">
        <div className="xb-award-wrap">
          <div className="award-top ul_li_between align-items-end mb-10">
            <div className="sec-title--two sec-title--three mb-30">
              <Fade direction="down" triggerOnce={true} duration={1000} delay={9}>
                <div>
                  <span className="sub-title wow fadeInDown" data-wow-delay="000ms" data-wow-duration="600ms">
                    <Image src={hicon} alt="" />
                    <span>Our Achievements</span>
                  </span>
                </div>
              </Fade>
              <Fade direction="up" triggerOnce={true} duration={1200} delay={9}>
                <div>
                  <h2 className="title wow skewIn" data-wow-delay="000ms" data-wow-duration="600ms">
                    Awards and Recognition
                  </h2>
                </div>
              </Fade>
            </div>
            <p className="content mb-30">
              We’re proud of the awards we’ve earned, reflecting our dedication to delivering top-notch cybersecurity
              solutions and the trust our clients place in us.
            </p>
          </div>

          <div className="row">
            {awards.map((award, i) => (
              <div className="col-lg-3" key={i}>
                <Fade direction="up" triggerOnce={true} duration={award.duration} delay={9}>
                  <div>
                    <div className="award-item wow fadeInUp" data-wow-delay="000ms" data-wow-duration="600ms">
                      <div className="xb-img">
                        <Image src={award.icon} alt="" />
                      </div>
                      <span className="xb-title">{award.title}</span>
                    </div>
                  </div>
                </Fade>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Achievements;
