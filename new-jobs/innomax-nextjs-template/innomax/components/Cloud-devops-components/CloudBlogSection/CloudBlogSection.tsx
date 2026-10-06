'use client';

import React from 'react';
import { blogs } from '../../../api/blogs';
import { Fade } from 'react-awesome-reveal';
import Link from 'next/link';
import shape from '../../../public/images/shape/blog-shape01.png';
import Image from 'next/image';

const CloudBlogSection: React.FC = () => {
  return (
    <section className="blog pos-rel z-1 pt-150 pb-150" style={{ backgroundColor: "#212877" }}>
      <div className="container">
        <div className="cd-blog-wrap">

          {/* Section Title */}
          <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-9">
              <div className="sec-title--five text-center white-sec-title mb-40">
                <Fade direction="up" triggerOnce duration={1000} delay={9}>
                  <h2 className="title">Latest News FROM OUR EXPERTS</h2>
                </Fade>
              </div>
            </div>
          </div>

          {/* Blog Cards */}
          <div className="row mt-none-30 justify-content-center">
            {blogs.slice(6, 9).map((blog, index) => (
              <div className="col-lg-4 col-md-6 mt-30" key={blog.id ?? index}>
                <div className="cd-blog-item wow fadeInUp" data-wow-delay="0ms" data-wow-duration="600ms">

                  {/* Blog Thumbnail */}
                  <Link href="/blog-single" className="xb-item--img" aria-label={`Read more about ${blog.title}`}>
                    <Image
                      src={blog.screens}
                      alt={blog.title}
                      width={500}
                      height={300}
                      style={{ width: '100%', height: 'auto' }}
                    />
                  </Link>

                  {/* Blog Content */}
                  <div className="xb-item--holder pt-40">
                    <span className="xb-item--sub_title">{blog.author ?? 'Unknown Author'}</span>
                    <h2 className="xb-item--title border-effect">
                      <Link href="/blog-single">{blog.title}</Link>
                    </h2>
                    <Link href="/blog-single" className="xb-item--arrow" aria-label={`Read more about ${blog.title}`}>
                      <i className="far fa-arrow-right"></i>
                    </Link>
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div className="xb-btn mt-70 text-center wow fadeInUp" data-wow-duration="600ms">
            <Link href="/blog" className="thm-btn thm-btn--devops thm-btn--devops_yellow">
              Read all Blog
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Shape */}
      <div className="cd-sec-shape">
        <div className="shape shape--three">
          <Image src={shape} alt="Decorative shape" />
        </div>
      </div>
    </section>
  );
};

export default CloudBlogSection;
