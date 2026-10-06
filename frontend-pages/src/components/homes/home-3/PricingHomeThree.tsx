
import Image from 'next/image';
import Link from 'next/link'
import React from 'react'

interface StyleProps {
  style_2?: boolean;
}

// images import   
import pricing_img from "@/assets/images/about-us/icon1.svg"; 

export default function PricingHomeThree({style_2} : StyleProps) {
  return (
    <>
      <section className={`luminix-padding-section4 ${style_2 ? '' : 'light-bg1'} `}>
        <div className="container">
          <div className="luminix-section-title center">
            <h2>Explore our service fees and packages</h2>
          </div>
          <div className="row">
            <div className="col-xl-4 col-lg-6">
              <div className={`luminix-pricing-wrap ${style_2 ? 'light-bg1' : ''}`} data-aos="fade-up" data-aos-duration="500">
                <div className="luminix-pricing-header">
                  <h5>GROWTH</h5>
                </div>
                <div className="luminix-pricing-price">
                  <h2>$39</h2>
                  <span>$45</span>
                </div>
                <div className="luminix-pricing-text">
                  <p>Suitable for team of increasingly skilled people and company</p>
                </div>
                <div className="luminix-pricing-body">
                  <div className="luminix-list-icon-content">
                    <ul>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Traditional consulting
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        24/7 Support available
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Tax preparation feature
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        30-Day analysis and Insights
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Data aggregation
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="luminix-pricing-footer mt-50">
                  <Link href="/contact-us" className={`luminix-default-btn d-block extra-btn ${style_2 ? 'pill' : ''}`}>Choose The Plan</Link>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-6">
              <div className={`luminix-pricing-wrap ${style_2 ? 'active' : ''}`} data-aos="fade-up" data-aos-duration="700">
                <div className="luminix-pricing-header">
                  <h5>STANDARD</h5>
                </div>
                <div className="luminix-pricing-price">
                  <h2>$45</h2>
                  <span>$99</span>
                </div>
                <div className="luminix-pricing-text">
                  <p>We aim to develop innovative solutions for managing individuals</p>
                </div>
                <div className="luminix-pricing-body">
                  <div className="luminix-list-icon-content">
                    <ul>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Advanced consulting
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        24/7 Support available
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Advanced tax preparation
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        60-Day analysis and Insights
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Data aggregation
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="luminix-pricing-footer mt-50">
                  <Link href="/contact-us" className={`luminix-default-btn d-block extra-btn ${style_2 ? 'pill' : ''}`}>Choose The Plan</Link>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-6">
              <div className={`luminix-pricing-wrap ${style_2 ? 'light-bg1' : ''}`} data-aos="fade-up" data-aos-duration="900">
                <div className="luminix-pricing-header">
                  <h5>EXTENDED</h5>
                </div>
                <div className="luminix-pricing-price">
                  <h2>$100</h2>
                  <span>$200</span>
                </div>
                <div className="luminix-pricing-text">
                  <p>Offering a premium plan means a higher-level membership</p>
                </div>
                <div className="luminix-pricing-body">
                  <div className="luminix-list-icon-content">
                    <ul>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Advanced consulting
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        24/7 Support available
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Advanced tax preparation
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Unlimited analysis and Insights
                      </li>
                      <li>
                        <Image width={25} height={24} src={pricing_img} alt="here is theme image" />
                        Data aggregation
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="luminix-pricing-footer mt-50">
                  <Link href="/contact-us" className={`luminix-default-btn d-block extra-btn ${style_2 ? 'pill' : ''}`}>Choose The Plan</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
