import React, { FC } from "react";
import Link from "next/link";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";

// Assets
import hImg from "../../public/images/hero/hero-img01.png";
import shape1 from "../../public/images/shape/hero-shape01.png";
import shape2 from "../../public/images/shape/hero-shape04.png";

const Hero2: FC = () => {
  return (
    <section
      className="hero hero-style-one pos-rel bg_img"
      style={{ backgroundImage: `url('/images/bg/hero-bg01.jpg')` }}
    >
      {/* Decorative Shapes */}
      <div className="hero-shape">
        <div
          className="shape shape--one bg_img"
          style={{ backgroundImage: `url('/images/shape/hero-glassisom.png')` }}
        ></div>
        <div className="shape shape--two">
          <Image src={shape1} alt="Decorative Shape 1" />
        </div>
        <div className="shape shape--three">
          <Image src={shape2} alt="Decorative Shape 2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="hero_wrap">
          <div className="row">
            {/* Left Content */}
            <div className="col-md-6">
              <div className="xb-hero">
                <Fade direction="up" triggerOnce={false} duration={800} delay={6}>
                  <h1 className="xb-item--title wow fadeInUp" data-wow-duration="600ms">
                    Transform Business with Reliable IT Solutions That Scale
                  </h1>
                </Fade>

                <Fade direction="up" triggerOnce={false} duration={1500} delay={9}>
                  <p
                    className="xb-item--content wow fadeInUp"
                    data-wow-delay="150ms"
                    data-wow-duration="600ms"
                  >
                    Tailored IT solutions designed to enhance your business efficiency, security, and
                    performance.
                  </p>
                </Fade>

                <Fade direction="up" triggerOnce={false} duration={1800} delay={9}>
                  <div
                    className="xb-btn wow mt-60 fadeInUp"
                    data-wow-delay="300ms"
                    data-wow-duration="600ms"
                  >
                    <Link
                      href="/contact"
                      className="thm-btn thm-btn--fill_icon thm-btn--white_icon"
                    >
                      <div className="xb-item--hidden">
                        <span className="xb-item--hidden-text">Get started now</span>
                      </div>
                      <div className="xb-item--holder">
                        <span className="xb-item--text">Get started now</span>
                        <div className="xb-item--icon">
                          <i className="far fa-long-arrow-right"></i>
                        </div>
                        <span className="xb-item--text">Get started now</span>
                      </div>
                    </Link>
                  </div>
                </Fade>
              </div>
            </div>

            {/* Right Image */}
            <div className="col-md-6">
              <div className="hero-right_img">
                <Image
                  className="wow skewIn"
                  data-wow-duration="800ms"
                  src={hImg}
                  alt="Hero Illustration"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero2;
