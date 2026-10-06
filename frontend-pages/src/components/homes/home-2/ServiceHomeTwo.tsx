
import service_data_two from '@/data/service-data-two'
import RightArrawIcon from '@/svg/RightArrawIcon'
import Link from 'next/link'
import React from 'react'

export default function ServiceHomeTwo() {
  return (
    <>
      <section className="luminix-padding-section5">
        <div className="container">
          <div className="luminix-section-title center">
            <h6>Our Services</h6>
            <h2 className="title pb-0">We provide expert business solutions</h2>
          </div>
          <div className="row">
            {service_data_two.map((item, i) => (
              <div key={i} className="col-xl-3 col-lg-6 col-md-6">
                <div className={`luminix-iconbox-wrap luminix-iconbox-bg-${i + 1}`} data-aos="fade-up" data-aos-duration={item.aosDelay} >
                  <div className="luminix-iconbox-icon" dangerouslySetInnerHTML={{ __html: item.icon }}>
                  </div>
                  <div className="luminix-iconbox-content">
                    <h5>{item.title}</h5>
                    <p>{item.description}</p>
                  </div>
                  <div className="luminix-iconbox-btn">
                    <Link href="/single-service">Read More
                      <RightArrawIcon />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="service-btn">
            <Link href="/service" className="luminix-default-btn extra-btn2">View All Services</Link>
          </div>
        </div>
      </section>
    </>
  )
}
