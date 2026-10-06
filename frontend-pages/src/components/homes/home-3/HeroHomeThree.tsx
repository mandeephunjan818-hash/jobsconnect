
import Image from 'next/image'
import Link from 'next/link'

// images import   
import hero_img from "@/assets/images/hero/hero7.png"; 

export default function HeroHomeThree() {
  return (
    <>
      <section className="luminix-hero-section3 section luminix-hero3-bg-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-5 order-lg-2">
              <div className="luminix-hero-thumb" data-aos="fade-left" data-aos-duration="700">
                <Image width={526} height={750} src={hero_img} alt="here is theme image" />
              </div>
            </div>
            <div className="col-lg-7 d-flex align-items-center">
              <div className="luminix-hero-content3">
                <h1 data-aos="fade-up" data-aos-duration="700" className="hero-title">We empower startups with creativity</h1>
                <p data-aos="fade-up" data-aos-duration="900" className="text">We provide tailored business strategies and solutions to address your challenges, fostering sustainable growth and long-term success.</p>
                <div className="hero-btn btn2 mt-50">
                  <Link href="/contact-us" className="default-btn2 btn3" data-aos="fade-up" data-aos-duration="700">Get In Touch</Link>
                  <Link href="/service" className="default-btn3" data-aos="fade-up" data-aos-duration="900">Explore Services</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
