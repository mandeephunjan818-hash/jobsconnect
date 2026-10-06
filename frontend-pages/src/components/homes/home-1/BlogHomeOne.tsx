import blog_data from '@/data/blog-data';
import RightArrawIcon from '@/svg/RightArrawIcon';
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'; 

// images import  
import icon1_img from "@/assets/images/blog/icon1.svg";
import date_img from "@/assets/images/blog/date.svg";

export default function BlogHomeOne() {
  return (
    <div className="luminix-padding-section4 light-bg1">
      <div className="container">
        <div className="luminix-section-title">
          <div className="row">
            <div className="col-xl-7 col-lg-8">
              <h6>[Our Latest News]</h6>
              <h2 className="title pb-0">Explore our latest blogs and news</h2>
            </div>
            <div className="col-xl-5 col-lg-4 d-flex align-items-center justify-content-end">
              <div className="luminix-title-btn">
                <Link href="/blog" className="luminix-default-btn">
                  View All Post 
                  <RightArrawWhitIcon />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          {blog_data.map((item) => (
            <div className="col-xl-4 col-md-6" key={item.id}>
              <div className="luminix-blog-wrap" data-aos="fade-up" data-aos-duration={item.aosDelay}>
                <div className="luminix-blog-thumb">
                  <Link href="/single-blog">
                    <Image width={416} height={300} src={item.image} alt={item.title} />
                  </Link>
                  <div className="luminix-blog-frame">
                    <Link href="/single-blog">{item.category}</Link>
                  </div>
                </div>
                <div className="luminix-blog-content">
                  <div className="luminix-blog-meta">
                    <Link href="/blog">
                      <Image width={15} height={18} src={icon1_img} alt="Author" />
                      by {item.author}
                    </Link>
                    <Link href="/blog">
                      <Image width={15} height={16} src={date_img} alt="Date" />
                      {item.date}
                    </Link>
                  </div>
                  <div className="title pt-0">
                    <h5 className="blog-title">
                      <Link href="/blog">{item.title}</Link>
                    </h5>
                  </div>
                  <div className="luminix-blog-btn">
                    <Link href="/single-blog">
                      Read More 
                      <RightArrawIcon />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
