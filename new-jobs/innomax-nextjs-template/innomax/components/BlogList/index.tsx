'use client';

import React, { useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';

import Link from 'next/link';
import Image from 'next/image';

import { blogs } from '../../api/blogs';
import BlogSidebar from '../BlogSidebar';

import iconPrev from '../../public/images/icon/prev-icon.png';
import iconNext from '../../public/images/icon/next-icon.png';
import fallbackImage from '../../public/images/blog/b-img01.jpg';

const BlogList = () => {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    if (
      swiperRef.current &&
      prevRef.current &&
      nextRef.current &&
      swiperRef.current.params.navigation
    ) {
      swiperRef.current.params.navigation.prevEl = prevRef.current;
      swiperRef.current.params.navigation.nextEl = nextRef.current;
      swiperRef.current.navigation.init();
      swiperRef.current.navigation.update();
    }
  }, []);

  return (
    <div>
      {/* Blog Hero Swiper Section */}
      <div className="blog pt-70">
        <div className="container">
          <div className="blog-slider pos-rel">
            <Swiper
              modules={[Navigation]}
              spaceBetween={50}
              slidesPerView={1}
              loop={true}
              speed={1800}
              parallax={true}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
            >
              {blogs.slice(0, 3).map((blog, index) => (
                <SwiperSlide key={index}>
                  <div className="blog-slide-item">
                    <div className="xb-item--img">
                      <Link href="/blog-single">
                        <Image
                          src={fallbackImage}
                          alt={blog.title}
                          width={1200}
                          height={600}
                        />
                      </Link>
                    </div>
                    <div className="xb-item--holder">
                      <Link href="/blog-single" className="xb-item--tag">
                        software
                      </Link>
                      <h2 className="xb-item--title border-effect">
                        <Link href="/blog-single">
                          {blog.title}
                        </Link>
                      </h2>
                      <p className="xb-item--content">
                        Embark on an enlightening journey through the realm of IT solutions as we delve into the
                        latest technological advancements shaping the digital landscape.
                      </p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Navigation */}
            <div className="blog-item_button">
              <div className="blog-swiper-btn swiper-button-prev" ref={prevRef}>
                <Image src={iconPrev} alt="Previous" width={40} height={40} />
              </div>
              <div className="blog-swiper-btn swiper-button-next" ref={nextRef}>
                <Image src={iconNext} alt="Next" width={40} height={40} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blog List Section */}
      <section className="blog_details_section pb-130 mt-120">
        <div className="container">
          <div className="row mt-none-30 g-0 align-items-start">
            <div className="col-lg-8 mt-30">
              <div className="blog_details_content">
                {blogs.slice(0, 6).map((blog, index) => (
                  <div className="blog_details_item ul_li" key={index}>
                    <div className="xb-item--img">
                      <Link href="/blog-single">
                        <Image
                          src={blog.screens || fallbackImage}
                          alt={blog.title}
                          width={800}
                          height={500}
                        />
                      </Link>
                    </div>
                    <div className="xb-item--holder">
                      <span className="xb-item--text">{blog.thumb}</span>
                      <h3 className="xb-item--title border-effect">
                        <Link href="/blog-single">
                          {blog.title}
                        </Link>
                      </h3>
                      <p className="xb-item--content">{blog.description}</p>
                      <div className="xb-item--button mt-50">
                        <Link href="/blog-single">
                          Read more <i className="far fa-arrow-right"></i>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Basic Pagination UI */}
                <ul className="blog-pagination ul_li">
                  <li>
                    <Link href="/blog?page=1">
                      <i className="fas fa-chevron-double-left"></i>
                    </Link>
                  </li>
                  <li><Link href="/blog?page=1">1</Link></li>
                  <li className="active"><Link href="/blog?page=2">2</Link></li>
                  <li><Link href="/blog?page=3">3</Link></li>
                  <li>
                    <Link href="/blog?page=4">
                      <i className="fas fa-chevron-double-right"></i>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Blog Sidebar */}
            <BlogSidebar />
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogList;
