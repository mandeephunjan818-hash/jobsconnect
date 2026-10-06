
import Count from '@/common/count'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

// images import  
import about1_img from "@/assets/images/about-us/about1.png";
import about2_img from "@/assets/images/about-us/about2.png";
import icon3_img from "@/assets/images/about-us/icon3.svg";
import about3_img from "@/assets/images/about-us/about3.png";
import icon2_img from "@/assets/images/about-us/icon2.svg"; 

export default function AboutHomeTwo() {
  return (
    <>
      <section className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 order-lg-2">
              <div className="luminix-about-thumb2" data-aos="fade-up" data-aos-duration="700">
                <Image width={278} height={555} src={about1_img} alt="here is theme image" />
                <div className="luminix-about-thumb3" data-aos="fade-up" data-aos-duration="900">
                  <Image width={278} height={440} src={about2_img} alt="here is theme image" />
                </div>
                <div className="luminix-about-card2">
                  <div className="luminix-about-card-icon">
                    <Image width={62} height={62} src={icon3_img} alt="here is theme image" />
                    <div className="counter-card">
                      <h2 className="luminix-counter-data" aria-label="12K+">
                       <Count number={12} text={'K+'} />

                      </h2>
                      <span className="text">Total Clients</span>
                    </div>
                  </div>
                  <p>We serve 12000+ clients with proven results.</p>
                </div>
              </div>
              <div className="luminix-about-thumb4">
                <Image width={556} height={1110} src={about3_img} alt="here is theme image" />
              </div>
            </div>
            <div className="col-lg-6">
              <div className="luminix-default-content">
                <h6>About Us</h6>
                <h2 className="title">Maximum through strategic means</h2>
                <p className="text3">We help maximize your business potential through strategic planning, ensuring every move drives success. Our approach ensures sustainable growth and lasting results.</p>
                <div className="luminix-list-icon-content content2">
                  <ul>
                    <li>
                      <Image width={23} height={23} src={icon2_img} alt="here is theme image" />
                      Improve & grow customer experience
                    </li>
                    <li>
                      <Image width={23} height={23} src={icon2_img} alt="here is theme image" />
                      Leverage digital marketing strategies
                    </li>
                    <li>
                      <Image width={23} height={23} src={icon2_img} alt="here is theme image" />
                      Expand your product or service range
                    </li>
                  </ul>
                </div>
                <h5>Our mission is to connect businesses, ideas and people for greater impact</h5>
                <div className="mt-50">
                  <Link href="/about-us" className="luminix-default-btn extra-btn">About Us</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
