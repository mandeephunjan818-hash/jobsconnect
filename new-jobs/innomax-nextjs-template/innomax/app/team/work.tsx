'use client';

import React from 'react';
import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';

import icon1 from '../../public/images/icon/tp-work-icon01.svg';
import icon2 from '../../public/images/icon/tp-work-icon02.svg';
import icon3 from '../../public/images/icon/tp-work-icon03.svg';
import icon4 from '../../public/images/icon/tp-work-icon04.svg';
import icon5 from '../../public/images/icon/tp-work-icon05.svg';
import icon6 from '../../public/images/icon/tp-work-icon06.svg';
import iIcon from '../../public/images/icon/eye-icon.svg';
import iIcon2 from '../../public/images/icon/sms-white-icon01.svg';

interface WorkItem {
  id: number;
  icon: StaticImageData;
  title: string;
  content: string;
}

interface WorkSectionProps {
  bg?: string;
}

const workItems: WorkItem[] = [
  {
    id: 1,
    icon: icon1,
    title: 'Endless career growth',
    content:
      'We provide lots of career growth opportunities to our employees, which is reflected both financially and reputably.',
  },
  {
    id: 2,
    icon: icon2,
    title: 'Mentorship & learning',
    content:
      'We support peer assistance and offer mentorship programs like IT Talks and in-house courses for different roles.',
  },
  {
    id: 3,
    icon: icon3,
    title: 'Cozy & fun offices',
    content:
      'Our four R&D offices offer a gym, yoga mats, snacks, foosball, a VR set, and more for a comfortable workspace.',
  },
  {
    id: 4,
    icon: icon4,
    title: 'Competitive salary',
    content:
      'Our projects belong to a wide variety of industries, which will make your professional background more diverse.',
  },
  {
    id: 5,
    icon: icon5,
    title: 'Career change option',
    content:
      'No need to job hunt to learn new tech or switch roles—we’ll support your transition within innomax.',
  },
  {
    id: 6,
    icon: icon6,
    title: 'Friendly atmosphere',
    content:
      'We value people as innomax greatest asset and ensure hierarchy never works against our employees.',
  },
];

const WorkSection: React.FC<WorkSectionProps> = ({ bg }) => {
  return (
    <section className={`work pb-130 ${bg || ''}`}>
      <div className="container">
        <div className="sec-title--two text-center mb-60">
          <div className="sub-title">
            <Image src={iIcon} alt="Section icon" />
            Why work with us
          </div>
          <h2 className="title">Why people work with us</h2>
        </div>

        <div className="tp-work-wrapp">
          <div className="row mt-none-30">
            {workItems.map((item) => (
              <div className="col-lg-6 mt-30" key={item.id}>
                <div className="tp-work-item">
                  <div className="xb-item--inner ul_li">
                    <div className="xb-item--icon">
                      <Image src={item.icon} alt={item.title} />
                    </div>
                    <div className="xb-item--holder">
                      <h3 className="xb-item--title">{item.title}</h3>
                      <p className="xb-item--content">{item.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="header-contact text-center mt-60">
            <Link href="/contact" className="thm-btn thm-btn--aso thm-btn--header-black">
              Let’s talk
              <Image src={iIcon2} alt="Talk icon" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkSection;
