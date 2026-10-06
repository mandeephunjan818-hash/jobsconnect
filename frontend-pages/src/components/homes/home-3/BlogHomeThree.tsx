
import RightArrawIcon from '@/svg/RightArrawIcon'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

// images import  
import blog1_img from "@/assets/images/blog/blog1.png";
import icon1_img from "@/assets/images/blog/icon1.svg";
import date_img from "@/assets/images/blog/date.svg";
import blog2_img from "@/assets/images/blog/blog2.png"; 
import blog3_img from "@/assets/images/blog/blog3.png"; 

export default function BlogHomeThree() {
  return (
    <>
      <div className="luminix-padding-section4 light-bg1">
        <div className="container">
          <div className="luminix-section-title center">
            <h2>Explore our latest blogs and news</h2>
          </div>
          <div className="row">
            <div className="col-xl-4 col-md-6">
              <div className="luminix-blog-wrap" data-aos="fade-up" data-aos-duration="500">
                <div className="luminix-blog-thumb">
                  <Link href="/single-blog"><Image width={416} height={300} src={blog1_img} alt="here is theme image" /></Link>
                  <div className="luminix-blog-frame"><Link href="/single-blog">Business</Link></div>
                </div>
                <div className="luminix-blog-content">
                  <div className="luminix-blog-meta">
                    <Link href="/blog"><Image width={15} height={18} src={icon1_img} alt="here is theme image" />by admin</Link>
                    <Link href="/blog"><Image width={15} height={16} src={date_img} alt="here is theme image" />July 5, 2024</Link>
                  </div>
                  <div className="title pt-0">
                    <h5 className="blog-title"><Link href="/blog"> A profitable business makes you happy and grow </Link></h5>
                  </div>
                  <div className="test">
                    <div className="luminix-blog-btn">
                      <Link href="/single-blog">Read More 
                        <RightArrawIcon />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-md-6">
              <div className="luminix-blog-wrap" data-aos="fade-up" data-aos-duration="700">
                <div className="luminix-blog-thumb">
                  <Link href="/single-blog"><Image width={416} height={300} src={blog2_img} alt="here is theme image" /></Link>
                  <div className="luminix-blog-frame"><Link href="/single-blog">Marketing</Link></div>
                </div>
                <div className="luminix-blog-content">
                  <div className="luminix-blog-meta">
                    <Link href="/blog"><Image width={15} height={18} src={icon1_img} alt="here is theme image" />by admin</Link>
                    <Link href="/blog"><Image width={15} height={16} src={date_img} alt="here is theme image" />July 3, 2024</Link>
                  </div>
                  <div className="title pt-0">
                    <h5 className="blog-title"><Link href="/blog">Business consulting drives results and success</Link></h5>
                  </div>
                  <div className="test">
                    <div className="luminix-blog-btn">
                      <Link href="/single-blog">Read More
                        <RightArrawIcon />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-md-6">
              <div className="luminix-blog-wrap" data-aos="fade-up" data-aos-duration="900">
                <div className="luminix-blog-thumb">
                  <Link href="/single-blog"><Image width={416} height={300} src={blog3_img} alt="here is theme image" /></Link>
                  <div className="luminix-blog-frame"><Link href="/single-blog">Finance</Link></div>
                </div>
                <div className="luminix-blog-content">
                  <div className="luminix-blog-meta">
                    <Link href="/blog"><Image width={15} height={18} src={icon1_img} alt="here is theme image" />by admin</Link>
                    <Link href="/blog"><Image width={15} height={16} src={date_img} alt="here is theme image" />June 27, 2024</Link>
                  </div>
                  <div className="title pt-0">
                    <h5 className="blog-title"><Link href="/blog">Greater financial flexibility for strategic planning</Link></h5>
                  </div>
                  <div className="test">
                    <div className="luminix-blog-btn">
                      <Link href="/single-blog">Read More
                        <RightArrawIcon />
                      </Link>
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
