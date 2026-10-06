import React, { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import blog5 from '../../public/images/blog/blog_details-img04.jpg';
import icon7 from '../../public/images/icon/icon-left.png';
import icon8 from '../../public/images/icon/profile-circle.svg';
import icon9 from '../../public/images/icon/icon-right.png';

interface OtherDescriptionProps {}

const OtherDescription: FC<OtherDescriptionProps> = () => {
  return (
    <div>
      <div className="postabmin_block ul_li">
        <div className="admin_image">
          <Image src={blog5} alt="Avatar" />
        </div>
        <div className="admin_content">
          <h4 className="admin_name">About Anderson</h4>
          <span className="admin_designation">Content Editor</span>
          <p>
            A content editor plays a pivotal role in shaping and refining the narrative and quality of digital content. This role
            involves.
          </p>
          <ul className="social_icons_blocks list-unstyled ul_li">
            <li>
              <Link aria-label="Facebook" href="/blog">
                <i className="fab fa-facebook-f"></i>
              </Link>
            </li>
            <li>
              <Link aria-label="Instagram" href="/blog">
                <i className="fab fa-instagram"></i>
              </Link>
            </li>
            <li>
              <Link aria-label="Linkedin" href="/blog">
                <i className="fab fa-linkedin-in"></i>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <hr className="mb-50" />

      <div className="row">
        <div className="col-md-6">
          <ul className="tags_block list-unstyled">
            <li>
              <Link href="/blog">Cybersecurity</Link>
            </li>
            <li>
              <Link href="/blog">AppDev</Link>
            </li>
            <li>
              <Link href="/blog">SEO</Link>
            </li>
          </ul>
        </div>
        <div className="col-md-6">
          <ul className="social_icons_block list-unstyled ul_li justify-content-md-end">
            <li>
              <Link aria-label="Facebook" href="/blog">
                <i className="fab fa-facebook-f"></i>
              </Link>
            </li>
            <li>
              <Link aria-label="Twitter" href="/blog">
                <i className="fab fa-twitter"></i>
              </Link>
            </li>
            <li>
              <Link aria-label="Linkedin" href="/blog">
                <i className="fab fa-linkedin-in"></i>
              </Link>
            </li>
            <li>
              <Link aria-label="Instagram" href="/blog">
                <i className="fab fa-instagram"></i>
              </Link>
            </li>
            <li>
              <Link aria-label="Social Share" href="/blog">
                <i className="fas fa-share-alt"></i>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="other_post_nav ul_li_between">
        <Link href="/blog" className="post-nav-item">
          <div className="xb-item--arrow pos-rel">
            <Image src={icon7} alt="Previous Post" />
            <span></span>
          </div>
          <div className="xb-item--holder">
            <h3 className="xb-item--title">Exploring IT solutions <br /> ..with innomax</h3>
            <span className="xb-item--text">
              <Image src={icon8} alt="Author" /> Christopher
            </span>
          </div>
        </Link>

        <Link href="/blog" className="xb-bar">
          <i className="fas fa-th-large"></i>
        </Link>

        <Link href="/blog" className="post-nav-item">
          <div className="xb-item--holder">
            <h3 className="xb-item--title">Measuring SEO success <br /> key metrics tools..</h3>
            <span className="xb-item--text">
              <Image src={icon8} alt="Author" /> Michael
            </span>
          </div>
          <div className="xb-item--arrow pos-rel">
            <Image src={icon9} alt="Next Post" />
            <span></span>
          </div>
        </Link>
      </div>

      <div className="item_details-newslatter">
        <div className="xb-item--holder ul_li_between align-items-start">
          <div className="xb-item-heading_info">
            <h3 className="item_details_info_heading">Subscribe to our updates</h3>
            <p>
              Stay up to date! Get all of our resources and news <br /> delivered straight to your inbox.
            </p>
          </div>
          <span className="xb-item--bell-icon">
            <i className="fas fa-bell"></i>
          </span>
        </div>

        <div className="xb-item--item-input_field pos-rel">
          <input type="email" placeholder="innomax@example.com" />
          <button type="submit">Subscribe</button>
        </div>
      </div>
    </div>
  );
};

export default OtherDescription;
