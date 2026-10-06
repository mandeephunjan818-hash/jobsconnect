
import RightArrawSmallIcon from '@/svg/RightArrawSmallIcon'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

// images import   
import icon3_img from "@/assets/images/service/icon3.svg"; 
import icon4_img from "@/assets/images/service/icon4.svg"; 
import icon5_img from "@/assets/images/service/icon5.svg"; 
import icon6_img from "@/assets/images/service/icon6.svg"; 
import icon1_img from "@/assets/images/service/icon1.svg"; 
import icon2_img from "@/assets/images/service/icon2.svg"; 



export default function ServiceHomeThree() {
  return (
    <>
      <section className="luminix-padding-section">
        <div className="container">
          <div className="luminix-section-title center">
            <h2>Great services to run your business</h2>
          </div>
          <div className="row">
            <div className="col-lg-4 col-md-6">
              <div className="luminix-service-wrap" data-aos="fade-up" data-aos-duration="500">
                <div className="luminix-service-icon">
                  <Image width={60} height={60} src={icon3_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-content">
                  <h5>Data Security</h5>
                  <p>Practices that organizations and individuals employ to ensure the confidentiality.</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">Read More 
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 col-md-6">
              <div className="luminix-service-wrap" data-aos="fade-up" data-aos-duration="700">
                <div className="luminix-service-icon">
                  <Image width={56} height={60} src={icon4_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-content">
                  <h5>SEO & Optimization</h5>
                  <p>SEO like google use to complex to algorithms to the relevance & authorith.</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">Read More
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 col-md-6">
              <div className="luminix-service-wrap" data-aos="fade-up" data-aos-duration="900">
                <div className="luminix-service-icon">
                  <Image width={70} height={60} src={icon5_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-content">
                  <h5>Analytics & Research</h5>
                  <p>Analytics to the process of data often through statistical and quantitative.</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">Read More
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 col-md-6">
              <div className="luminix-service-wrap" data-aos="fade-up" data-aos-duration="1100">
                <div className="luminix-service-icon">
                  <Image width={56} height={60} src={icon6_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-content">
                  <h5>Financial Services</h5>
                  <p>Financial services refer to a broad range of the economic services provided.</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">Read More
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 col-md-6">
              <div className="luminix-service-wrap" data-aos="fade-up" data-aos-duration="1300">
                <div className="luminix-service-icon">
                  <Image width={62} height={60} src={icon1_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-content">
                  <h5>Market Analysis</h5>
                  <p>Market analysis services provide a detailed assessment, introduction of your brand.</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">Read More
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 col-md-6">
              <div className="luminix-service-wrap" data-aos="fade-up" data-aos-duration="1500">
                <div className="luminix-service-icon">
                  <Image width={66} height={60} src={icon2_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-content">
                  <h5>Paid Advertising</h5>
                  <p>Related to their products services or to have their ads displayed prominently.</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">Read More
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="service-btn">
            <Link href="/service" className="luminix-default-btn extra-btn2">View All Services</Link>
          </div>
        </div>
      </section>
    </>
  )
}
