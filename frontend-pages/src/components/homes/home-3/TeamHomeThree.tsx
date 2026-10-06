"use client";
import Image from 'next/image';
import Link from 'next/link'
import React from 'react'
import Slider from 'react-slick'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


// images import   
import team1_img from "@/assets/images/team/team1.png";
import team2_img from "@/assets/images/team/team2.png";
import team5_img from "@/assets/images/team/team5.png";
import team6_img from "@/assets/images/team/team6.png";
import socialLinks from '@/data/socialLinks';


export default function TeamHomeThree() {


  return (
    <>
      <div className="luminix-padding-section3">
        <div className="container">
          <div className="luminix-section-title">
            <div className="row">
              <div className="col-xl-7 col-lg-8">
                <h2>Meet our excellent team members</h2>
              </div>
              <div className="col-xl-5 col-lg-4 d-flex align-items-center justify-content-end">
                <div className="luminix-title-btn pl-102">
                  <p>We are truly passionate about what we do! Let us introduce you to our amazing team members who make it all happen. </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Slider
          slidesToShow={6}
          slidesToScroll={1}
          arrows={false}
          autoplay={true}
          dots={false}
          centerMode={true}
          speed={200}
          responsive={[
            {
              breakpoint: 1600,
              settings: {
                slidesToShow: 6
              }
            }, {
              breakpoint: 1399,
              settings: {
                slidesToShow: 4
              }
            }, {
              breakpoint: 991,
              settings: {
                slidesToShow: 2
              }
            }, {
              breakpoint: 0,
              settings: {
                slidesToShow: 1
              }
            }
          ]}


          className="luminix-team-slider">
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team6_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team2_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team5_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team1_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team5_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team1_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team6_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team2_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team1_img} alt="here is theme image" />
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
          <div className="luminix-team-wrap">
            <div className="luminix-team-thumb">
              <Image width={294} height={384} src={team1_img} alt="here is theme image" />
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
        </Slider>
      </div>
    </>
  )
}
