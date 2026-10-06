import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon'
import ServiceRightArrawIcon from '@/svg/ServiceRightArrawIcon'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'


// images import  
import thumb1_img from "@/assets/images/v1/thumb-01.png";
import thumb2_img from "@/assets/images/v1/thumb-02.png";
import icon1_img from "@/assets/images/iconbox/icon1.svg";
import icon2_img from "@/assets/images/iconbox/icon2.svg";
import icon3_img from "@/assets/images/iconbox/icon3.svg";
import icon4_img from "@/assets/images/iconbox/icon4.svg";

export default function ServiceHomeOne() {
  return (
    <>
      <div className="luminix-padding-section2 light-bg1">
        <div className="container">
          <div className="luminix-section-title">
            <div className="row">
              <div className="col-xl-7 col-lg-8">
                <h6>[Our Services]</h6>
                <h2 className="title pb-0 ml-20">Providing our services worldwide</h2>
              </div>
              <div className="col-xl-5 col-lg-4 d-flex align-items-center justify-content-end">
                <div className="luminix-title-btn">
                  <Link href="/about-us" className="luminix-default-btn pill">View All Solution 
                    <RightArrawWhitIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6">
              <div className="luminix-about-thumb" data-aos="fade-up" data-aos-duration="700">
                <Image width={500} height={499} src={thumb1_img} alt="here is theme image" />
                <div className="luminix-service-card">
                  <Image width={280} height={280} src={thumb2_img} alt="here is theme image" />
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="luminix-list-icon-wraper">
                <div className="luminix-list-icon-wrap">
                  <div className="luminix-list-icon-icon2">
                    <Image width={60} height={60} src={icon1_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-list-icon-data">
                    <Link href="/service">
                      <h5>Innovative Business </h5>
                    </Link>
                    <p>Innovative business is one that introduces new ideas, products, or methods to create value.</p>
                  </div>
                </div>
                <div className="luminix-list-icon-btn">
                  <Link href="/single-service">
                    <ServiceRightArrawIcon />
                  </Link>
                </div>
              </div>
              <div className="luminix-list-icon-wraper">
                <div className="luminix-list-icon-wrap">
                  <div className="luminix-list-icon-icon2">
                    <Image width={60} height={60} src={icon2_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-list-icon-data">
                    <Link href="/single-service">
                      <h5>Finance Consulting</h5>
                    </Link>
                    <p>Finance consulting is the expert guidance on managing, optimizing, and planning financial strategies.</p>
                  </div>
                </div>
                <div className="luminix-list-icon-btn">
                  <Link href="/single-service">
                    <ServiceRightArrawIcon />
                  </Link>
                </div>
              </div>
              <div className="luminix-list-icon-wraper">
                <div className="luminix-list-icon-wrap">
                  <div className="luminix-list-icon-icon2">
                    <Image width={60} height={60} src={icon3_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-list-icon-data">
                    <Link href="/single-service">
                      <h5>Business Strategies</h5>
                    </Link>
                    <p>Business strategies are plans and actions designed by a company to achieve goals and gain advantage.</p>
                  </div>
                </div>
                <div className="luminix-list-icon-btn">
                  <Link href="/single-service">
                    <ServiceRightArrawIcon />
                  </Link>
                </div>
              </div>
              <div className="luminix-list-icon-wraper">
                <div className="luminix-list-icon-wrap">
                  <div className="luminix-list-icon-icon2">
                    <Image width={60} height={60} src={icon4_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-list-icon-data">
                    <Link href="/single-service">
                      <h5>Advanced Analytic</h5>
                    </Link>
                    <p>Advanced Analytics uses techniques like machine learning and predictive modeling to extract deeper insights.</p>
                  </div>
                </div>
                <div className="luminix-list-icon-btn">
                  <Link href="/single-service">
                    <ServiceRightArrawIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
