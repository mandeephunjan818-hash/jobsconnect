
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

// images import  
import about4_img from "@/assets/images/about-us/about4.png";
import author_img from "@/assets/images/about-us/author.png";
import icon1_img from "@/assets/images/about-us/icon1.svg"; 

export default function AboutHomeThree() {
  return (
    <>
      <div className="luminix-padding-section light-bg1">
        <div className="container">
          <div className="row">
            <div className="col-lg-5">
              <div className="luminix-about-thumb" data-aos="fade-up" data-aos-duration="700">
                <Image width={526} height={580} src={about4_img} alt="here is theme image" />
                <div className="luminix-about-card3">
                  <Image width={162} height={65} src={author_img} alt="here is theme image" />
                  <h6>The average rating is 4.8, making us the world's best business organization.</h6>
                </div>
              </div>
            </div>
            <div className="col-lg-7 d-flex align-items-center">
              <div className="luminix-default-content pl-100">
                <h2 className="title2">We create a unique vision for business</h2>
                <p className="text">Tailored strategies turn your vision into reality with innovative solutions. We focus on understanding your unique needs to provide customized business advice that sets you apart.</p>
                <div className="luminix-list-icon-content">
                  <ul>
                    <li>
                      <Image width={25} height={24} src={icon1_img} alt="here is theme image" />
                      Improve customer experience
                    </li>
                    <li>
                      <Image width={25} height={24} src={icon1_img} alt="here is theme image" />
                      Leverage digital marketing
                    </li>
                    <li>
                      <Image width={25} height={24} src={icon1_img} alt="here is theme image" />
                      Expand product or service range
                    </li>
                  </ul>
                </div>
                <div className="mt-50">
                  <Link href="/about-us" className="luminix-default-btn extra-btn2">About Us</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
