"use client";
import VideoPopup from '../../../../modal/VideoPopup';
import Image from 'next/image';
import React, { useState } from 'react'

interface StyleProps {
  style_2?: boolean;
}

// images import   
import play_btn_img from "@/assets/images/v2/play-btn1.svg";


export default function VideoHomeThree({ style_2 }: StyleProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);


  return (
    <>
      <div className={`luminix-padding-section video-section section luminix-video-bg ${style_2 ? 'mt-120' : ''} `} >
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <div className="luminix-video-content">
                <h2 className="video-title">An award-winning career platform</h2>
                <p className="video-text">Jobs Connect is a leading and award-winning platform dedicated to driving your professional growth and business success with tailored, innovative recruitment solutions.</p>
                {/* <div className="mt-50 play-btn">
                  <a className="luminix-popup-video3 video-init"
                    onClick={() => setIsVideoOpen(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Image width={100} height={100} src={play_btn_img} alt="here is theme image" />
                    <div className="waves waves2 wave-1"></div>
                    <div className="waves waves2 wave-2"></div>
                    <div className="waves waves2 wave-3"></div>
                  </a>
                  <p>Watch Video</p>
                </div> */}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="luminix-skill-wrap pl-100">
                <div className="luminix-skill-item">
                  <div className="luminix-skill-title title2 pb-0">
                    <h5>Talent Acquisition</h5>
                  </div>
                  <div className="luminix-skill-line">
                    <div className="luminix-skill-bar extra-bar bar-one"></div>
                  </div>
                </div>
                <div className="luminix-skill-item">
                  <div className="luminix-skill-title title2 pb-0">
                    <h5>Market Reach</h5>
                  </div>
                  <div className="luminix-skill-line2">
                    <div className="luminix-skill-bar2 extra-bar bar-two"></div>
                  </div>
                </div>
                <div className="luminix-skill-item">
                  <div className="luminix-skill-title title2 pb-0">
                    <h5>Candidate Matching</h5>
                  </div>
                  <div className="luminix-skill-line2">
                    <div className="luminix-skill-bar2 extra-bar bar-three"></div>
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
        videoId={"kNnYVpce_R4"}
      />
      {/* video modal end */}


    </>
  )
}
