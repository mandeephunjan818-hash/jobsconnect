
import socialLinks from '@/data/socialLinks';
import Image from 'next/image';
import Link from 'next/link'
import React from 'react'

interface StyleProps {
  style_2?: boolean;
}


// images import  
import team1_img from "@/assets/images/team/team1.png";
import team2_img from "@/assets/images/team/team2.png";
import team3_img from "@/assets/images/team/team3.png";
import team4_img from "@/assets/images/team/team4.png";



export default function TeamHomeOne({ style_2 }: StyleProps) {
  return (
    <>
      <div className="luminix-padding-section4">
        <div className="container">
          <div className="luminix-section-title center">
            {style_2 ? null : <h6>[Our Team Members]</h6>}
            <h2 className="title">Meet our excellent team members</h2>
            <p className="text2">We're truly passionate about what we do! Let us introduce you to our amazing team members who make it all happen. </p>
          </div>
          <div className="row">
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="luminix-team-wrap" data-aos="fade-up" data-aos-duration="500">
                <div className="luminix-team-thumb">
                  <Image width={306} height={400} src={team1_img} alt="here is theme image" />
                  <div className="luminix-team-content">
                    <Link href="/single-team">
                      <h5>James Bennett</h5>
                    </Link>
                    <p>Founder & CEO</p>
                    <div className="luminix-team-social">
                      <ul>
                         {socialLinks.map((link, index) => (
                          <li key={index}>
                            <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }}>

                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="luminix-team-wrap" data-aos="fade-up" data-aos-duration="700">
                <div className="luminix-team-thumb">
                  <Image width={306} height={400} src={team2_img} alt="here is theme image" />
                  <div className="luminix-team-content">
                    <Link href="/single-team">
                      <h5>Henry Collins</h5>
                    </Link>
                    <p>Senior Consultant</p>
                    <div className="luminix-team-social">
                      <ul>
                        {socialLinks.map((link, index) => (
                          <li key={index}>
                            <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }}>

                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="luminix-team-wrap" data-aos="fade-up" data-aos-duration="900">
                <div className="luminix-team-thumb">
                  <Image width={306} height={400} src={team3_img} alt="here is theme image" />
                  <div className="luminix-team-content">
                    <Link href="/single-team">
                      <h5>Oliver Wilson</h5>
                    </Link>
                    <p>Finance Consultant</p>
                    <div className="luminix-team-social">
                      <ul>
                        {socialLinks.map((link, index) => (
                          <li key={index}>
                            <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }}>

                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="luminix-team-wrap" data-aos="fade-up" data-aos-duration="1100">
                <div className="luminix-team-thumb">
                  <Image width={306} height={400} src={team4_img} alt="here is theme image" />
                  <div className="luminix-team-content">
                    <Link href="/single-team">
                      <h5>Thomas Graham</h5>
                    </Link>
                    <p>Management Officer</p>
                    <div className="luminix-team-social">
                      <ul>
                        {socialLinks.map((link, index) => (
                          <li key={index}>
                            <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }}>

                            </Link>
                          </li>
                        ))}
                      </ul>
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
