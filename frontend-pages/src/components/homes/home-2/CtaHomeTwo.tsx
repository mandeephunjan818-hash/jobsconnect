
import Link from 'next/link'
import React from 'react'

 

export default function CtaHomeTwo() {
  return (
    <>
      <section className="luminix-cta-section section luminix-cta-bg">
        <div className="container">
          <div className="luminix-cta-wrap">
            <h6>Contact Us</h6>
            <h2>Want to achieve your goals? Let's get started today!</h2>
            <div className="luminix-cta-btn-title mt-50">
              <Link href="/contact-us" className="default-btn2" data-aos="fade-up" data-aos-duration="700">Get In Touch</Link>
              <Link href="/faq" className="default-btn3" data-aos="fade-up" data-aos-duration="900">Have You Any Question</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
