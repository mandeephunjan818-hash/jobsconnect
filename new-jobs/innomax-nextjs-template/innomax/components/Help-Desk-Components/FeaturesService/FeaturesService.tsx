import React from 'react';
import { Fade } from "react-awesome-reveal";
import icon from '../../../public/images/icon/data-layer.svg';
import icon1 from '../../../public/images/icon/voice-icon.png';
import icon2 from '../../../public/images/icon/email-icon.png';
import icon3 from '../../../public/images/icon/chat-icon.png';
import icon4 from '../../../public/images/icon/analyze-icon.png';
import icon5 from '../../../public/images/icon/black-arrow.png';
import icon6 from '../../../public/images/shape/line-shape.png';
import icon7 from '../../../public/images/icon/manage-icon.png';
import icon8 from '../../../public/images/icon/service-icon.png';
import icon9 from '../../../public/images/icon/contact-icon.png';
import logo from '../../../public/images/logo/logo-black04.svg';
import Image from 'next/image';

interface FeaturesServiceProps {
}

const FeaturesService: React.FC<FeaturesServiceProps> = () => {
  return (
    <section id="features" className="feature pt-130 pb-130 o-hidden" style={{ backgroundColor: '#f6f0e6' }}>
      <div className="container">
        <div className="xb-feature-wrap pos-rel">
          <div className="sec-title--two sec-title--four text-center mb-65">
            <Fade direction='down' triggerOnce={false} duration={1000} delay={9}>
              <div>
                <div className="sub-title wow fadeInDown" data-wow-duration="600ms"><Image src={icon} alt="" />Feature-services</div>
              </div>
            </Fade>
            <Fade direction='down' triggerOnce={false} duration={1500} delay={9}>
              <div>
                <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">Why is the best innomax?</h2>
              </div>
            </Fade>
          </div>
          <div className="hd-feature--top">
            <div className="hd-feature-item text-center">
              <h3 className="xb-item--title">Automate</h3>
              <p className="xb-item--content">AI Agents for Omni-Channel, Human-Like Support Across 35+ Channels</p>
              <ul className="xb-item--meta list-unstyled">
                <li>
                  <Image src={icon1} alt="Voice icon" />
                  <span>Voice</span>
                </li>
                <li>
                  <Image src={icon2} alt="Email icon" />
                  <span>Email</span>
                </li>
                <li>
                  <Image src={icon3} alt="Chat icon" />
                  <span>Chat</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="hd-feature--middle">
            <div className="hd-feature-item">
              <Image src={icon4} alt="Analyze icon" />
              <h3 className="xb-item--title">Analyze</h3>
              <p className="xb-item--content">Analyze automation and <br /> agent metrics.</p>
            </div>
            <div className="hd-button-box pos-rel">
              <a href="index.html" className="hd-feature-button" aria-label="Innomax homepage">
                <span><Image src={logo} alt="Innomax Logo" /></span>
              </a>
              <div className="xb-arrow">
                <div className="arrow arrow--one"><Image src={icon5} alt="Arrow icon" /></div>
                <div className="arrow arrow--two"><Image src={icon5} alt="Arrow icon" /></div>
                <div className="arrow arrow--three"><Image src={icon5} alt="Arrow icon" /></div>
                <div className="arrow arrow--four"><Image src={icon5} alt="Arrow icon" /></div>
                <div className="arrow arrow--five"><Image src={icon6} alt="Line shape" /></div>
              </div>
            </div>
            <div className="hd-feature-item">
              <Image src={icon7} alt="Manage icon" />
              <h3 className="xb-item--title">Manage</h3>
              <p className="xb-item--content">Manage dynamic AI agents <br /> and knowledgebase.</p>
            </div>
          </div>
          <div className="hd-feature--bottom">
            <div className="hd-feature-item text-center">
              <h3 className="xb-item--title">Assist</h3>
              <p className="xb-item--content">AI Assistants for Better Agent Performance and Customer Service</p>
              <ul className="xb-item--meta list-unstyled ul_li_between">
                <li>
                  <Image src={icon8} alt="Service cloud icon" />
                  <span>Service cloud</span>
                </li>
                <li>
                  <Image src={icon9} alt="Contact centre icon" />
                  <span>Contact centre</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="xb-shape">
            <span></span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesService;
