import React from 'react';
import { Fade } from "react-awesome-reveal";
import Image from 'next/image';

import wImg1 from '../../../public/images/work/cd-work_img01.jpg';
import wImg2 from '../../../public/images/work/cd-work_img02.jpg';
import wImg3 from '../../../public/images/work/cd-work_img03.jpg';
import wImg4 from '../../../public/images/work/cd-work_img04.jpg';

import shape1 from '../../../public/images/shape/work-shape01.png';
import shape2 from '../../../public/images/shape/work-shape02.png';

const steps = [
  {
    number: 1,
    title: 'Discovery & Design',
    content: 'We gather requirements and design a system that optimizes resources, ensures reliability, and meets your project’s needs.',
    img: wImg1,
    imgAlt: 'Discovery and design phase',
  },
  {
    number: 2,
    title: 'Cost & Approval',
    content: 'We offer a transparent cost estimate based on the project’s scope, complexity, and timeline for approval.',
    img: wImg2,
    imgAlt: 'Cost estimation and approval process',
  },
  {
    number: 3,
    title: 'Deployment & CI/CD',
    content: 'We automate cloud resource setup and configure CI/CD pipelines for fast, error-free deployments.',
    img: wImg3,
    imgAlt: 'Deployment and CI/CD pipeline setup',
  },
  {
    number: 4,
    title: 'Support & Maintenance',
    content: 'Post-launch, we handle bug fixes, optimizations, and updates to keep your cloud environment running smoothly.',
    img: wImg4,
    imgAlt: 'Support and maintenance phase',
  },
];

const WorkFlow = () => {
  return (
    <section className="work pos-rel z-1 pt-150 pb-165">
      <div className="container">
        <div className="row">
          <div className="col-lg-5">
            <div className="cd-work-left">
              <div className="sec-title--five">
                <Fade direction="down" triggerOnce={true} duration={1000} delay={9}>
                  <h2 className="title wow skewIn" data-wow-duration="600ms">
                    How we get it done quick.
                  </h2>
                </Fade>
              </div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="cd-work-wrap">
              {steps.map(({ number, title, content, img, imgAlt }) => (
                <article className="cd-work-item" key={number}>
                  <div className="xb-item--inner">
                    <div className="xb-item--holder">
                      <h3 className="xb-item--title">{title}</h3>
                      <p className="xb-item--content">{content}</p>
                    </div>
                    <div className="xb-item--img">
                      <Image src={img} alt={imgAlt} />
                    </div>
                  </div>
                  <span className="xb-number">{number}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="cd-sec-shape">
        <div className="shape shape--one">
          <Image src={shape1} alt="Decorative shape one" />
        </div>
        <div className="shape shape--four">
          <Image src={shape2} alt="Decorative shape two" />
        </div>
      </div>
    </section>
  );
};

export default WorkFlow;
