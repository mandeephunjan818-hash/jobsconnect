import React from "react";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";

import icon from "../../../public/images/icon/work.svg";
import wImg1 from "../../../public/images/work/img01.png";
import wImg2 from "../../../public/images/work/img02.png";
import wImg3 from "../../../public/images/work/img03.png";
import icon1 from "../../../public/images/icon/work-icon01.png";
import icon2 from "../../../public/images/icon/work-icon02.png";
import icon3 from "../../../public/images/icon/work-icon03.png";
import dash from "../../../public/images/icon/das-linee01.png";
import arrow from "../../../public/images/icon/right-arrow.png";

const WorkFlow = () => {
  return (
    <section className="work">
      <div className="container">
        <div
          className="xb-work-wrap pos-rel bg_img pt-100 pb-155"
          style={{ backgroundImage: `url('/images/bg/work-bg.png')` }}
        >
          <div className="sec-title--two sec-title--three text-center mb-60">
            <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
              <div>
                <span
                  className="sub-title wow fadeInDown"
                  data-wow-duration="600ms"
                >
                  <Image src={icon} alt="Work icon" />
                  <span>How we work</span>
                </span>
              </div>
            </Fade>
            <Fade direction="down" triggerOnce={false} duration={800} delay={9}>
              <div>
                <h2
                  className="title wow fadeInDown"
                  data-wow-duration="600ms"
                >
                  Our Security Workflow
                </h2>
              </div>
            </Fade>
          </div>

          <div className="row align-items-center">
            {[
              {
                icon: icon1,
                title: "Risk Assessment & Consultation",
                img: wImg1,
                number: "01",
              },
              {
                icon: icon2,
                title: "Solution Design and Implementation",
                img: wImg2,
                number: "02",
              },
              {
                icon: icon3,
                title: "Monitoring and Support",
                img: wImg3,
                number: "03",
              },
            ].map(({ icon, title, img, number }, index) => (
              <div
                key={number}
                className={`col-lg-4 mt-30 d-inline-flex justify-content-center`}
              >
                <div
                  className={`xb-work-item pos-rel ${
                    index === 0
                      ? "wow fadeInLeft"
                      : index === 2
                      ? "wow fadeInRight"
                      : "xb-work-item--middle"
                  }`}
                  data-wow-delay="150ms"
                  data-wow-duration="600ms"
                >
                  <div className="xb-item--ineer">
                    <div className="xb-item--icon">
                      <Image src={icon} alt={`${title} icon`} />
                    </div>
                    <h4 className="xb-item--title">{title}</h4>
                  </div>
                  <div className="xb-img">
                    <Image src={img} alt={`${title} illustration`} />
                  </div>
                  <div className="xb-item--content">
                    <div className="xb-item--line">
                      <Image src={dash} alt="Decorative dash line" />
                    </div>
                    <span className="xb-item--number">{number}</span>
                  </div>
                  {/* Arrow only on first two items */}
                  {index < 2 && (
                    <div className="xb-item--arrow">
                      <Image src={arrow} alt="Right arrow" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkFlow;
