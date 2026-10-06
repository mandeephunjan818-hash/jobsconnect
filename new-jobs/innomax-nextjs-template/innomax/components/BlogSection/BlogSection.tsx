import React, { FC } from 'react';
import { blogs } from '../../api/blogs';
import Link from 'next/link';
import Bg from '../../public/images/shapes/bg_pattern_1.svg';
import icon1 from '../../public/images/icons/icon_calendar.svg';
import Image from 'next/image';

interface Blog {
  id: string;
  title: string;
  slug: string;
  screens: any;         
  description?: string;
  author?: string;
  authorTitle?: string;
  create_at?: string;
  comment?: string | number;
  thumb?: string;
  blClass?: string;
  read?: string;
}

const BlogSection: FC = () => {
  return (
    <section
      className="blog_section section_space bg-light"
      style={{ backgroundImage: `url(${Bg.src})` }}
    >
      <div className="container">
        <div className="heading_block text-center">
          <div className="heading_focus_text">
            <span className="badge bg-secondary text-white">Blog</span> Updates
          </div>
          <h2 className="heading_text mb-0">Latest Articles Posts</h2>
        </div>

        <div className="row">
          {blogs.slice(0, 3).map((blog: Blog) => (
            <div className="col-lg-4" key={blog.id}>
              <div className="blog_post_block">
                <div className="blog_post_image">
                  <Link href="/blog-single" className="image_wrap">
                    <Image
                      src={blog.screens}
                      alt={blog.title ?? 'Blog image'}
                      width={400}
                      height={250}
                      style={{ objectFit: 'cover' }}
                    />
                  </Link>
                </div>
                <div className="blog_post_content">
                  <div className="post_meta_wrap">
                    <ul className="category_btns_group unordered_list">
                      <li>
                        <Link href="/blog-single">
                          {blog.thumb ?? 'No category'}
                        </Link>
                      </li>
                    </ul>
                    <ul className="post_meta unordered_list">
                      <li>
                        <Link href="/blog-single">
                          <Image src={icon1} alt="Icon Calendar" width={16} height={16} />{' '}
                          {blog.create_at ?? 'Unknown date'}
                        </Link>
                      </li>
                      <li>
                        <Link href="/blog-single">
                          <i className="fa-regular fa-comment-lines"></i> {blog.comment ?? 0}
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <h3 className="blog_post_title">
                    <Link href="/blog-single">
                      {blog.title}
                    </Link>
                  </h3>
                  <Link href="/blog-single" className="btn_unfill">
                    <span className="btn_icon">
                      <i className="fa-solid fa-arrow-up-right"></i>
                    </span>
                    <span className="btn_label">Read More</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
