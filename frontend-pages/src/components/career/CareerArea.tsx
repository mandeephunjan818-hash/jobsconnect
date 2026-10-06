
import Count from '@/common/count'
import Image from 'next/image'

// images import  
import about5_img from "@/assets/images/about-us/about5.png";
import about6_img from "@/assets/images/about-us/about6.png";
import ab2_img from "@/assets/images/about-us/ab2.png";
 

export default function CareerArea() {
  return (
    <>
      <div className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-5">
              <div className="luminix-about-career-thumb" data-aos="fade-up" data-aos-duration="900">
                <Image width={278} height={505} src={about5_img} alt="here is theme image" />
                <div className="luminix-about-career-thumb2" data-aos="fade-up" data-aos-duration="700">
                  <Image width={278} height={343} src={about6_img} alt="here is theme image" />
                </div>
                <div className="counter-card2">
                  <h2 className="luminix-counter-data" aria-label="95%"> 
                    <Count number={95} text='%' />
                    </h2>
                  <span className="text">Employee Satisfaction rate</span>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="luminix-default-content pl-99">
                <h2 className="title pt-0">People want to join us for best career</h2>
                <p className="text4">At Adviser, we are dedicated to attracting top-level consulting talent and fostering an environment where our employees can thrive professionally.</p>
                <p className="text5">We believe that continuous growth and development is the key to success, which is why we provide our team with ample opportunities to hone their skills, expand their skills and take on new challenges.</p>
                <h5>Our mission is to connect businesses, ideas and people for greater impact</h5>
                <div className="luminix-about-author-wrap">
                  <div className="luminix-about-author-thumb">
                    <Image width={50} height={50} src={ab2_img} alt="here is theme image" />
                  </div>
                  <div className="luminix-about-author-data">
                    <h6>James Bennett</h6>
                    <p>Founder & CEO</p>
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
