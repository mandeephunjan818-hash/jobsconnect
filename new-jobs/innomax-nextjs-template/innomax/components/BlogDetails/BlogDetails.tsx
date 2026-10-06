'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import blog1 from '../../public/images/service/cd-image.jpg';
import blog2 from '../../public/images/blog/blog_details-img01.jpg';
import blog3 from '../../public/images/blog/blog_details-img02.jpg';

import icon1 from '../../public/images/icon/icon_calendar.svg';
import icon2 from '../../public/images/icon/user-black.svg';
import icon3 from '../../public/images/icon/icon_comment.svg';
import icon4 from '../../public/images/icon/icon_eye.svg';
import icon5 from '../../public/images/icon/icon_link.svg';
import icon6 from '../../public/images/icon/icon_bookmark.svg';

import BlogSidebar from '../BlogSidebar';
import RelatedService from './RelatedBlog';
import Description from './Description';
import OtherDescription from './OtherDescription';

const BlogSingle: React.FC = () => {

  return (
    <section className="blog_details_section pt-70">
      <div className="container">
        <div className="item-details_image pos-rel mb-80">
          <Image src={blog1} alt="Blog Feature" />
        </div>

        <div className="item_details_content pb-80">
          <ul className="post_meta ul_li list-unstyled">
            <li>
              <Link href="/blog">
                <span className="meta_label1"></span>
              </Link>
            </li>
            <li>
              <Link href="/blog">
                <span className="meta_icon">
                  <Image src={icon1} alt="Calendar" />
                </span>
                <span className="meta_label">Last Update:</span>
              </Link>
            </li>
          </ul>
          <h2 className="item_details_heading"></h2>
          <p className="mb-40">
            Embark on an enlightening journey through the realm of IT solutions as we delve into the latest technological advancements shaping the digital landscape.
          </p>

          <div className="row">
            <div className="col-md-6">
              <ul className="post_meta list-unstyled ul_li">
                <li>
                  <Link href="/blog">
                    <span className="meta_icon"><Image src={icon2} alt="Author" /></span>
                    <span className="meta_label">by Madura</span>
                  </Link>
                </li>
                <li>
                  <Link href="/blog">
                    <span className="meta_icon"><Image src={icon3} alt="Comments" /></span>
                    <span className="meta_label">50 Comments</span>
                  </Link>
                </li>
                <li>
                  <Link href="/blog">
                    <span className="meta_icon"><Image src={icon4} alt="Views" /></span>
                    <span className="meta_label">20k Views</span>
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <ul className="post_meta list-unstyled ul_li justify-content-md-end">
                <li>
                  <Link href="/blog">
                    <span className="meta_icon"><Image src={icon5} alt="Link" /></span>
                    <span className="meta_label">Copy Link</span>
                  </Link>
                </li>
                <li>
                  <Link href="/blog">
                    <span className="meta_icon"><Image src={icon6} alt="Bookmark" /></span>
                    <span className="meta_label">Bookmark</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <hr className="mt-5" />
        </div>

        <div className="row mt-none-30 g-0 align-items-start">
          <div className="col-lg-8 mt-30">
            <div className="blog_details_content">
              <div className="post_audio">
                <button className="audio_play_btn" type="button">
                  <i className="fas fa-play"></i>
                  <span>6:24</span>
                  <span>Listen to this article!</span>
                </button>
              </div>

              <h3 className="item_details_info_heading">
                Revolutionizing business efficiency navigating growth <br /> with optimal IT infrastructure enhancement
              </h3>

              <div className="row mb-4">
                <div className="col-md-6 col-sm-6">
                  <div className="image_block">
                    <Image src={blog2} alt="Detail 1" />
                  </div>
                </div>
                <div className="col-md-6 col-sm-6">
                  <div className="image_block">
                    <Image src={blog3} alt="Detail 2" />
                  </div>
                </div>
              </div>

              <p>Gain exclusive insights into the world of IT solutions with Innomax’s distinguished thought leaders...</p>
              <p>Embark on an illuminating journey into the world of IT solutions with our esteemed thought leaders...</p>

              <div className="blog-details-video mt-70">
                <iframe
                  width="880"
                  height="440"
                  src="https://www.youtube.com/embed/brvfBk97KyI?si=Q7zy3j4WYFoCYpsQ"
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>

              <Description />
              <OtherDescription />
            </div>
          </div>

          <BlogSidebar />
        </div>

        <div className="related-blog pt-130 pb-130">
          <h2 className="related-blog-title">Browse related blog</h2>
          <RelatedService />
        </div>
      </div>
    </section>
  );
};

export default BlogSingle;
