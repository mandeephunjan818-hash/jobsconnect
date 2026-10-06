import React from 'react';
import { Fade } from "react-awesome-reveal";
import check from '../../public/images/icon/check.svg';
import error from '../../public/images/icon/erorr.svg';
import logo from '../../public/images/logo/logo-white.svg';
import star from '../../public/images/icon/star.svg';
import Image from 'next/image';

interface FeaturesSectionProps {
}

const FeaturesSection: React.FC<FeaturesSectionProps> = (props) => {
  return (
    <section className="feature">
      <div className="feature-wrapper sec-bg sec-bg--2 pt-130 pb-130">
        <div className="container">
          <div className="feature_inner">
            <div className="sec-title--two text-center mb-60">
              <Fade direction='down' triggerOnce={false} duration={1000} delay={9}>
                <div>
                  <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
                    <Image src={star} alt="Star icon" />Why we’re different
                  </div>
                </div>
              </Fade>
              <Fade direction='up' triggerOnce={false} duration={1200} delay={9}>
                <div>
                  <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                    Take a look at how we&apos;re different
                  </h2>
                </div>
              </Fade>
            </div>
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Features</th>
                  <th><Image src={logo} alt="Our Logo" /></th>
                  <th>Other SEO agencies</th>
                </tr>
              </thead>
              <tbody className="table-body">
                <tr>
                  <td>Take on projects only if confident in delivery.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={error} alt="Error icon" /></td>
                </tr>
                <tr>
                  <td>Tailor-made, revenue-boosting strategy.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={error} alt="Error icon" /></td>
                </tr>
                <tr>
                  <td>100% focus on your project.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={error} alt="Error icon" /></td>
                </tr>
                <tr>
                  <td>Transparent about meeting goals and deadlines.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={check} alt="Checkmark" /></td>
                </tr>
                <tr>
                  <td>Cares about long-term SEO success.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={error} alt="Error icon" /></td>
                </tr>
                <tr>
                  <td>Knows that ROI is the most important metric.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={error} alt="Error icon" /></td>
                </tr>
                <tr>
                  <td>Feels like an extension of your marketing team.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={check} alt="Checkmark" /></td>
                </tr>
                <tr>
                  <td>Crafts a results-driven strategy.</td>
                  <td><Image src={check} alt="Checkmark" /></td>
                  <td><Image src={check} alt="Checkmark" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
