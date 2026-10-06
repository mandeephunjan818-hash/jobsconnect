import React from 'react'
import Link from "next/link";
import sIcon1 from '../../../public/images/icon/int-icon.svg'
import sIcon2 from '../../../public/images/icon/arrow-black.png'
import Image, { StaticImageData } from 'next/image';

import Icon1 from '../../../public/images/icon/int-icon01.png'
import Icon2 from '../../../public/images/icon/int-icon02.png'
import Icon3 from '../../../public/images/icon/int-icon03.png'
import Icon4 from '../../../public/images/icon/int-icon04.png'
import Icon8 from '../../../public/images/icon/int-icon08.png'
import Icon9 from '../../../public/images/icon/int-icon09.png'
import Icon10 from '../../../public/images/icon/int-icon10.png'
import Icon11 from '../../../public/images/icon/int-icon11.png'
import Icon12 from '../../../public/images/icon/int-icon12.png'
import Icon13 from '../../../public/images/icon/int-icon13.png'
import Icon14 from '../../../public/images/icon/int-icon14.png'

type IntegrationItem = {
  icon: StaticImageData;
  title: string;
}

const leftColumnItems: IntegrationItem[] = [
  { icon: Icon1, title: 'Google Analytics' },
  { icon: Icon2, title: 'Omnisend' },
  { icon: Icon3, title: 'Mailchimp' },
  { icon: Icon4, title: 'Hubspot' },
];

const leftColumnItems2: IntegrationItem[] = [
  { icon: Icon1, title: 'Instagram' },
  { icon: Icon2, title: 'Zendesk' },
  { icon: Icon3, title: 'Messenger' },
];

const rightColumnItems: IntegrationItem[] = [
  { icon: Icon8, title: 'Slack' },
  { icon: Icon9, title: 'Tidio OpenAPI' },
  { icon: Icon10, title: 'Loom' },
];

const rightColumnItems2: IntegrationItem[] = [
  { icon: Icon11, title: 'Active Campaign' },
  { icon: Icon12, title: 'Shopify' },
  { icon: Icon13, title: 'WhatsApp' },
  { icon: Icon14, title: 'Airtable' },
];

const IntegrationSection: React.FC = () => {
  // Function to repeat items for marquee effect (if needed)
  const repeatItems = (items: IntegrationItem[], times = 3): IntegrationItem[] => {
    return Array(times).fill(items).flat();
  };

  return (
    <section id="integration" className="integration pt-120 pb-120" style={{ backgroundColor: '#f6f0e6' }}>
      <div className="container">
        <div className="row">
          {/* Left Column */}
          <div className="col-lg-4 col-md-6">
            <div className="integration-left ul_li_between flex-nowrap">
              <div className="intgration-item--one pos-rel">
                <div className="integration-inner marquee-first">
                  {repeatItems(leftColumnItems).map((item, i) => (
                    <div className="integration-item" key={`left1-${i}`}>
                      <div className="xb-icon"><Image src={item.icon} alt={item.title} /></div>
                      <span className="xb-title">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="intgration-item--two pos-rel">
                <div className="integration-inner marquee-2">
                  {repeatItems(leftColumnItems2).map((item, i) => (
                    <div className="integration-item" key={`left2-${i}`}>
                      <div className="xb-icon"><Image src={item.icon} alt={item.title} /></div>
                      <span className="xb-title">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="col-lg-4 col-md-6">
            <div className="integration-middle">
              <div className="xb-inner">
                <div className="sec-title--two sec-title--four">
                  <div className="sub-title"><Image src={sIcon1} alt="Integration Icon" />Integration</div>
                  <h2 className="title">Popular apps integrate with us</h2>
                </div>
                <div className="xb-btn mt-40">
                  <Link href="/pricing" passHref className="thm-btn thm-btn--three thm-btn--black">
                      Start your free trial
                      <span>
                        <Image className="img--one" src={sIcon2} alt="Arrow icon" />
                        <Image className="img--two" src={sIcon2} alt="Arrow icon" />
                      </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-lg-4 col-md-6">
            <div className="integration-right ul_li_between flex-nowrap">
              <div className="intgration-item--two pos-rel">
                <div className="integration-inner marquee-first">
                  {repeatItems(rightColumnItems).map((item, i) => (
                    <div className="integration-item" key={`right1-${i}`}>
                      <div className="xb-icon"><Image src={item.icon} alt={item.title} /></div>
                      <span className="xb-title">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="intgration-item--one pos-rel">
                <div className="integration-inner marquee-2">
                  {repeatItems(rightColumnItems2).map((item, i) => (
                    <div className="integration-item" key={`right2-${i}`}>
                      <div className="xb-icon"><Image src={item.icon} alt={item.title} /></div>
                      <span className="xb-title">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default IntegrationSection;
