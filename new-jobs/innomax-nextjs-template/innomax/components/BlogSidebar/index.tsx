import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { blogs } from '../../api/blogs';
import Services from '../../api/service';

import searchIcon from '../../public/images/icon/search-icon.svg';
import authorIcon from '../../public/images/icon/profile-circle.svg';

const BlogSidebar = () => {
  return (
    <div className="col-lg-4 mt-30">
      <aside className="sidebar">
        {/* Search Widget */}
        <div className="sidebar_widget">
          <h3 className="sidebar_widget_title">Search</h3>
          <form className="form-group">
            <input
              className="form-control"
              type="search"
              name="search"
              placeholder="Search blog..."
            />
            <button type="submit" className="search_icon" aria-label="Search">
              <Image src={searchIcon} alt="Search icon" />
            </button>
          </form>
        </div>

        {/* Recent Posts */}
        <div className="sidebar_widget">
          <h3 className="sidebar_widget_title">Related Posts</h3>
          <ul className="recent_post_block list-unstyled">
            {blogs.slice(0, 3).map((blog) => (
              <li className="recent_post_item" key={blog.slug}>
                <h3 className="post-title border-effect-2">
                  <Link href="/blog-single">{blog.title}</Link>
                </h3>
                <span>
                  <Image src={authorIcon} alt="Author icon" width={16} height={16} />
                  By Michael David
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div className="sidebar_widget">
          <h3 className="sidebar_widget_title">Categories</h3>
          <ul className="category_list_block list-unstyled">
            {Services.slice(0, 6).map((service) => (
              <li key={service.Id}>
                <Link href={'/service-single'}>
                  <span>
                    <i className="far fa-arrow-right"></i>
                    {service.title}
                  </span>
                  <span>
                    (
                    {Number(service.Id) < 10
                      ? `0${service.Id}`
                      : service.Id}
                    )
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        <div className="sidebar_widget">
          <h3 className="sidebar_widget_title">Tags</h3>
          <ul className="tags_block list-unstyled">
            {[
              'Cybersecurity',
              'AppDev',
              'SEO',
              'UXDesign',
              'TechSolutions',
              'IT',
              'Solution',
              'Consultants',
              'Cloud',
              'Optimization',
              'Startup',
              'Data',
            ].map((tag, idx) => (
              <li key={idx}>
                <Link href={`/blog?tag=${tag.toLowerCase()}`}>{tag}</Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default BlogSidebar;
