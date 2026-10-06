import React, { FC } from 'react';
import Image from 'next/image';
import blog4 from '../../public/images/blog/blog_details-img03.jpg';

interface DescriptionProps {}

const Description: FC<DescriptionProps> = () => {
  return (
    <div>
      <h3 className="item_details_info_heading">Optimizing growth with IT infrastructure</h3>
      <p>
        They provide a comprehensive and in-depth analysis that goes beyond surface-level. Join us as we uncover the secrets of IT
        solutions, guided by the wisdom and expertise of innomax thought leaders. Prepare to be inspired, informed, and empowered to
        navigate the ever-landscape of technology with confidence and clarity. you&apos;ll gain access to unparalleled expertise and
        discover new possibilities for success in the ever-evolving world of technology success in the ever-evolving world of technology.y.
      </p>

      <div className="row mb-90 align-items-center mt-none-30">
        <div className="col-md-6 mt-30">
          <div className="image_block">
            <Image src={blog4} alt="Blog" />
          </div>
        </div>
        <div className="col-md-6 mt-30">
          <ul className="iconlist_block">
            <li>
              <span className="iconlist_text">Unveiling Emerging Technologies.</span>
            </li>
            <li>
              <span className="iconlist_text">Navigating Complex Challenges.</span>
            </li>
            <li>
              <span className="iconlist_text">Forecasting Future Trends.</span>
            </li>
            <li>
              <span className="iconlist_text">Driving Innovation Strategies.</span>
            </li>
            <li>
              <span className="iconlist_text">Exploring Industry Practices.</span>
            </li>
            <li>
              <span className="iconlist_text">Empowering Transformation.</span>
            </li>
          </ul>
        </div>
      </div>

      <h3 className="item_details_info_heading">3 Reasons to investing at this moment</h3>
      <p>
        Here are three key reasons emphasizing the importance of optimizing ICO infrastructure <br /> for efficiency and growth:
      </p>
      <ul className="iconlist_block numlist_block list-unstyled">
        <li>
          <span className="iconlist_text">1. Enhanced Operational Agility.</span>
        </li>
        <li>
          <span className="iconlist_text">2. Resource Optimization & Cost Efficiency.</span>
        </li>
        <li>
          <span className="iconlist_text">3. Scalability and Innovation.</span>
        </li>
      </ul>
    </div>
  );
};

export default Description;
