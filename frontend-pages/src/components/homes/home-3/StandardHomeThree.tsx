
import Image from 'next/image'
import React from 'react'

// images import   
import thumb2_img from "@/assets/images/v3/thumb2.png"; 
import icon1_img from "@/assets/images/v3/icon1.svg"; 
import icon2_img from "@/assets/images/v3/icon2.svg";  



export default function StandardHomeThree() {
  return (
    <>
      <div className="luminix-padding-section7">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <div className="luminix-content-thumb2" data-aos="fade-up" data-aos-duration="700">
                <Image width={526} height={550} src={thumb2_img} alt="here is theme image" />
              </div>
            </div>
            <div className="col-lg-6 d-flex align-items-center">
              <div className="luminix-default-content">
                <h2 className="title2">We're held to the highest standards</h2>
                <p className="text">Consulting solutions for business growth is a phrase that most likely refers to a service offering that provides expert advice & strategies to expand.</p>
                <div className="mt-50">
                  <div className="luminix-list-icon-wrap wrap3">
                    <div className="luminix-list-icon-icon2">
                      <Image width={80} height={80} src={icon1_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-list-icon-data">
                      <h5>Help increase your profits & business value</h5>
                      <p>We specialize in talent management, recruitment, training and organizational development for business growth.</p>
                    </div>
                  </div>
                  <div className="luminix-list-icon-wrap wrap3">
                    <div className="luminix-list-icon-icon2">
                      <Image width={80} height={80} src={icon2_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-list-icon-data">
                      <h5>Extensive industry knowledge & experience</h5>
                      <p>Our activities involve market research, branding, grow customer engagement and digital marketing strategies.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
