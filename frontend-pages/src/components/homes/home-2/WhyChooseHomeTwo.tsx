"use client";
import VideoPopup from '../../../../modal/VideoPopup';
import Image from 'next/image';
import React, { useState } from 'react'

// images import  
import thumb1_img from "@/assets/images/v2/thumb1.png";
import play_btn1_img from "@/assets/images/v2/play-btn1.svg";
import icon5_img from "@/assets/images/iconbox/icon5.svg";
import icon6_img from "@/assets/images/iconbox/icon6.svg";
import icon7_img from "@/assets/images/iconbox/icon7.svg";

export default function WhyChooseHomeTwo() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <>
      <div className="luminix-content-section light-bg1">
        <div className="container">
          <div className="row luminix_screenfix_left">
            <div className="col-lg-6">
              <div className="luminix-content-thumb">
                <Image width={789} height={950} src={thumb1_img} alt="here is theme image" />
                <a className="luminix-popup-video2 video-init"
                  onClick={() => setIsVideoOpen(true)}
                  style={{ cursor: "pointer" }}>
                  <Image width={100} height={100} src={play_btn1_img} alt="here is theme image" />
                  <div className="waves wave-1"></div>
                  <div className="waves wave-2"></div>
                  <div className="waves wave-3"></div>
                </a>
              </div>
            </div>
            <div className="col-lg-6 d-flex align-items-center">
              <div className="luminix-default-content extra-padding">
                <h6>Why Choose Us</h6>
                <h2 className="title">An award-winning consulting firm</h2>
                <p className="text2">Our firm is a leading and award-winning consulting firm dedicated to driving your business to success with tailored, innovative solutions.</p>
                <div className="mt-50">
                  <div className="luminix-list-icon-wrap wrap2" data-aos="fade-up" data-aos-duration="700">
                    <div className="luminix-list-icon-icon2">
                      <Image width={62} height={62} src={icon5_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-list-icon-data">
                      <h5>Customized Strategies and Solutions</h5>
                      <p>It involves evaluation to identify issues and provide insights. This method is in business and for understanding & effective solutions.</p>
                    </div>
                  </div>
                  <div className="luminix-list-icon-wrap wrap2" data-aos="fade-up" data-aos-duration="900">
                    <div className="luminix-list-icon-icon2">
                      <Image width={62} height={62} src={icon6_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-list-icon-data">
                      <h5>Effective Communication & Collaboration</h5>
                      <p>We always focus on effective communication and collaboration with clients and team members as critical skills for business success.</p>
                    </div>
                  </div>
                  <div className="luminix-list-icon-wrap wrap2" data-aos="fade-up" data-aos-duration="1100">
                    <div className="luminix-list-icon-icon2">
                      <Image width={62} height={62} src={icon7_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-list-icon-data">
                      <h5>Implementation Support and Follow-Up</h5>
                      <p>We are implementation support practice for professionals who help organizations, leaders & staff implement their evidence practices.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* video modal start */}
      <VideoPopup
        isVideoOpen={isVideoOpen}
        setIsVideoOpen={setIsVideoOpen}
        videoId={"Q5PG0rMXgvw"}
      />
      {/* video modal end */}
    </>
  )
}
