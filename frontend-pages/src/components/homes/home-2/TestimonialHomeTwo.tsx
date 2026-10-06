
import Image from 'next/image'
import React from 'react'


// images import  
import ratting_img from "@/assets/images/v2/ratting.svg";
import test2_img from "@/assets/images/v1/test2.png"; 
import test1_img from "@/assets/images/v1/test1.png"; 
import test3_img from "@/assets/images/v1/test3.png";

export default function TestimonialHomeTwo() {
  return (
    <>
      <section className="luminix-padding-section4">
        <div className="container">
          <div className="luminix-section-title center">
            <h6>Client Reviews</h6>
            <h2 className="title">Clients are always satisfied with us</h2>
            <p className="text">We have completed our projects seriously and have many positive client reviews that prove our expertise. Some of them are also mentioned here.</p>
          </div>
          <div className="row">
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="luminix-t-wrap2" data-aos="fade-up" data-aos-duration="500">
                <div className="luminix-t-ratting">
                  <Image width={174} height={30} src={ratting_img} alt="here is theme image" />
                </div>
                <div className="luminix-t-content2">
                  <p>“Working with luminix was a game-changer for our agency. Extremely recommended for businesses looking for transformative solutions.”</p>
                </div>
                <div className="luminix-t-author2">
                  <div className="luminix-t-author-thumb">
                    <Image width={60} height={60} src={test2_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-t-author2-data2">
                    <h6>Bonsey Johnson</h6>
                    <p>Businessman</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="luminix-t-wrap2" data-aos="fade-up" data-aos-duration="700">
                <div className="luminix-t-ratting">
                  <Image width={174} height={30} src={ratting_img} alt="here is theme image" />
                </div>
                <div className="luminix-t-content2">
                  <p>"Our experience has been great with a results-driven approach that has made a difference. They are a reliable partner for driving success."</p>
                </div>
                <div className="luminix-t-author2">
                  <div className="luminix-t-author-thumb">
                    <Image width={60} height={60} src={test1_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-t-author2-data2">
                    <h6>Daniel Turner</h6>
                    <p>Founder@ XYZ Comapny</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-6">
              <div className="luminix-t-wrap2" data-aos="fade-up" data-aos-duration="900">
                <div className="luminix-t-ratting">
                  <Image width={174} height={30} src={ratting_img} alt="here is theme image" />
                </div>
                <div className="luminix-t-content2">
                  <p>“Their team went beyond identifying issues; they provided actionable insights and worked collaboratively with our internal teams.”</p>
                </div>
                <div className="luminix-t-author2">
                  <div className="luminix-t-author-thumb">
                    <Image width={60} height={60} src={test3_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-t-author2-data2">
                    <h6>Michael Ramirez</h6>
                    <p>Director Of ZuBaz</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
