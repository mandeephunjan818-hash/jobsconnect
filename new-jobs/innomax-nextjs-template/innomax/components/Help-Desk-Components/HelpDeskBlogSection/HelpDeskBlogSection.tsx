'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Fade } from 'react-awesome-reveal';
import { blogs, ReadableBlog, BlogBase } from '../../../api/blogs';

// Icons
import icon from '../../../public/images/icon/cap-black.svg';
import icon2 from '../../../public/images/icon/edit-2.png';
import icon3 from '../../../public/images/icon/colorfilter.png';
import icon4 from '../../../public/images/icon/arrow-black.png';

// Type guard to narrow blogs that have 'read' property
function isReadableBlog(blog: BlogBase | ReadableBlog): blog is ReadableBlog {
  return typeof (blog as ReadableBlog).read === 'string';
}

const HelpDeskBlogSection: React.FC = () => {
  // Filter blogs to only those with 'read' (read time)
  const readableBlogs = blogs.filter(isReadableBlog);

  // Choose which blogs to show (adjust slices as needed)
  const mainBlog = readableBlogs.slice(0, 1);
  const sideBlogs = readableBlogs.slice(1, 4);

  return (
    <section className="blog pt-130">
      <div className="container">
        {/* Section Top */}
        <div className="hd-blog-top mb-30 ul_li_between">
          <div className="sec-title--two sec-title--four mb-30">
            <Fade direction="down" triggerOnce duration={1000} delay={9}>
              <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
                <Image src={icon} alt="news icon" width={24} height={24} /> News
              </div>
            </Fade>
            <Fade direction="down" triggerOnce duration={1500} delay={9}>
              <h2 className="title wow skewIn" data-wow-delay="150ms" data-wow-duration="600ms">
                Our latest news
              </h2>
            </Fade>
          </div>

          <Fade direction="right" triggerOnce duration={1500} delay={9}>
            <div
              className="xb-btn wow fadeInRight mb-30"
              data-wow-delay="150ms"
              data-wow-duration="600ms"
            >
              <Link href="/blog" passHref className="thm-btn thm-btn--three thm-btn--black">
                  More news
                  <span>
                    <Image className="img--one" src={icon4} alt="arrow" width={16} height={16} />
                    <Image className="img--two" src={icon4} alt="arrow" width={16} height={16} />
                  </span>
              </Link>
            </div>
          </Fade>
        </div>

        {/* Blog Content */}
        <div className="row mt-none-30">
          {/* Left Column */}
          <div className="col-lg-6 mt-30">
            {mainBlog.map((blog, index) => (
              <div className="hd-blog hd-blog-left" key={blog.slug + index}>
                <Link href="/blog-single" passHref className="xb-item--img">
                    <Image src={blog.screens} alt={blog.title} width={600} height={400} />
                </Link>
                <div className="xb-item--holder">
                  <ul className="xb-item--meta list-unstyled">
                    <li>
                      <span>
                        <Image src={icon2} alt="edit icon" width={20} height={20} />
                      </span>{' '}
                      Report
                    </li>
                    <li>{blog.read}</li>
                  </ul>
                  <h2 className="xb-item--title border-effect">
                    <Link href="/blog-single">{blog.title}</Link>
                  </h2>
                  <span className="xb-item--content">
                    Innomax’s AI-Support boosts efficiency and enhances customer service.
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="col-lg-6">
            {sideBlogs.map((blog, index) => (
              <div className="hd-blog hd-blog-right ul_li" key={blog.slug + index}>
                <div className="xb-item--holder">
                  <ul className="xb-item--meta list-unstyled">
                    <li>
                      <span>
                        <Image src={icon3} alt="report icon" width={20} height={20} />
                      </span>{' '}
                      Report
                    </li>
                    <li>{blog.read}</li>
                  </ul>
                  <h2 className="xb-item--title border-effect">
                    <Link href="/blog-single">{blog.title}</Link>
                  </h2>
                </div>
                <Link href="/blog-single" passHref className="xb-item--img">
                    <Image src={blog.screens} alt={blog.title} width={600} height={400} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HelpDeskBlogSection;
