
import Count from '@/common/count'
import Image from 'next/image'

// images import  
import about1 from "@/assets/images/about-us/about1.png";
import about2 from "@/assets/images/about-us/about2.png";
import icon3 from "@/assets/images/about-us/icon3.svg";
import about3 from "@/assets/images/about-us/about3.png";

export default function AboutArea({ pageIdentifier }: { pageIdentifier: string }) {
  return (
    <>
      <section className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 order-lg-2">
              <div className="luminix-about-thumb2" data-aos="fade-up" data-aos-duration="700">
                <Image width={278} height={555} src={about1} alt="here is theme image" />
                <div className="luminix-about-thumb3" data-aos="fade-up" data-aos-duration="900">
                  <Image width={278} height={440} src={about2} alt="here is theme image" />
                </div>
                <div className="luminix-about-card2">
                  <div className="luminix-about-card-icon">
                    <Image width={62} height={62} src={icon3} alt="here is theme image" />
                    <div className="counter-card">
                      <h2 className="luminix-counter-data" aria-label="12K+">
                        <Count number={12} text='K+' />
                      </h2>
                      <span className="text">Total Clients</span>
                    </div>
                  </div>
                  <p>We serve 12000+ clients with proven results.</p>
                </div>
              </div>
              <div className="luminix-about-thumb4" data-aos="fade-up" data-aos-duration="700">
                <Image width={556} height={1110} src={about3} alt="here is theme image" />
              </div>
            </div>
            <div className="col-lg-6">
              <div className="luminix-default-content">
                <h2 className="title pt-0">Our Journey Starts With a Big Dream</h2>
                <p className="text4 text-justify">At Jobs Connect, we set out with a clear vision: to reshape how talent and opportunity meet across all industries. At the core of our approach is a deep understanding of the dynamic nature of modern workplaces and markets. We know that businesses need exceptional people to grow, and professionals need the right platforms to thrive.</p>
                <p className="text5 text-justify">We embrace innovation by leveraging cutting-edge technology and data-driven insights. For employers, we help maximize business potential through strategic talent acquisition, ensuring success at every step of the hiring process. For job seekers, we provide streamlined access to meaningful career opportunities that align with their skills and ambitions.</p>
                {/* <h5>Our mission is to To connect businesses, ideas, and people for greater impact.</h5>
                <div className="luminix-about-author-wrap">
                  <div className="luminix-about-author-thumb">
                    <Image width={50} height={50} src={ab2} alt="here is theme image" />
                  </div>
                  <div className="luminix-about-author-data">
                    <h6>James Bennett</h6>
                    <p>Founder & CEO</p>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
