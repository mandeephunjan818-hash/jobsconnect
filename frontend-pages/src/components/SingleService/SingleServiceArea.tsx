 
import RightArrawIconService from "@/svg/RightArrawIconService";
import RightArrawWhitIcon from "@/svg/RightArrawWhitIcon";
import Image from "next/image";
import Link from "next/link";

// images import   
import service_s4_img from "@/assets/images/service/s4.png";
import service_s5_img from "@/assets/images/service/s5.png";
import service_s6_img from "@/assets/images/service/s6.png";
import service_line3_img from "@/assets/images/blog/line3.svg";
import service_line2_img from "@/assets/images/blog/line2.svg";
import service_line4_img from "@/assets/images/service/line4.svg";



const SingleServiceArea = () => {
  return (
    <>

      <div className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="luminix-service-d-wrap">
                <div className="luminix-service-d-thumb" data-aos="fade-up" data-aos-duration="700">
                  <Image width={826} height={500} src={service_s4_img} alt="here is theme image" />
                </div>
                <div className="luminix-service-d-data">
                  <p>Data security is the process of safeguarding digital information throughout its entire life cycle to protect it from corruption, theft, or unauthorized access. It covers everything—hardware, software, storage devices, and user devices; access and administrative controls; and organizations' policies and procedures.</p>
                </div>
                <div className="luminix-service-d-content">
                  <h3>4 Components of data security:</h3>
                  <p>With most enterprises entering the digital sphere, data security is becoming an ever-important consideration.</p>
                  <p><span>1. Data Confidentiality:</span> Data confidentiality refers to having strict, verified control of who or what can access data and how they are able to do so.</p>
                  <p><span>2. Data Integrity:</span> The integrity of your data - ensuring the accuracy, consistency, data through its entire lifecycle is necessary for your data to remain useful.</p>
                  <p><span>3. Data Authenticity:</span> While similar to the concept of data integrity, data authenticity is distinct because rather than just ensuring that the data is accurate.</p>
                  <p><span>4. Data Availability:</span> Data availability is the most often overlooked aspect of data security. Ensuring that the data is available and accessible is necessary.</p>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="luminix-blog-d-thumb2">
                        <Image width={401} height={278} src={service_s5_img} alt="here is theme image" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="luminix-blog-d-thumb2">
                        <Image width={401} height={278} src={service_s6_img} alt="here is theme image" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="luminix-service-d-content pt-0">
                  <h3>How important is data security?</h3>
                  <p>Not only is data security about maintaining the confidentiality of your data, but also its availability and integrity. You need your data to be available to use whenever you need it; you also require it to maintain its integrity and reliability. Otherwise, there's no point storing the data you produce.</p>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="luminix-blog-widgets">
                <h5>Our Services</h5>
                <div className="luminix-service-d-menu">
                  <Image width={155} height={2} className="line" src={service_line3_img} alt="here is theme image" />
                  <ul>
                    <li>
                      <Link href="/service">Data Security                         
                        <RightArrawIconService />
                      </Link>
                    </li>
                    <li>
                      <Link href="/service">SEO & Optimization
                        <RightArrawIconService />
                      </Link>
                    </li>
                    <li>
                      <Link href="/service">Analytics & Research
                        <RightArrawIconService />
                      </Link>
                    </li>
                    <li>
                      <Link href="/service">Financial Services
                        <RightArrawIconService />
                      </Link>
                    </li>
                    <li>
                      <Link href="/service">Paid Advertising
                        <RightArrawIconService />
                      </Link>
                    </li>
                    <li>
                      <Link href="/service">Market Analysis
                        <RightArrawIconService />
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="luminix-blog-widgets">
                <h5>Tags</h5>
                <Image width={56} height={2} className="line" src={service_line2_img} alt="here is theme image" />
                <div className="luminix-blog-tags">
                  <ul>
                    <li><Link href="/single-blog">Business</Link></li>
                    <li><Link href="/single-blog">Digital</Link></li>
                    <li><Link href="/single-blog">IT Solution</Link></li>
                    <li><Link href="/single-blog">Technology</Link></li>
                    <li><Link href="/single-blog">Agency</Link></li>
                    <li><Link href="/single-blog">Digital</Link></li>
                  </ul>
                </div>
              </div>
              <div className="luminix-blog-widgets">
                <h5>Newsletter</h5>
                <Image width={133} height={2} className="line" src={service_line4_img} alt="here is theme image" />
                <p className="text">Stay updated with our latest news</p>
                <div className="luminix-main-field field2">
                  <form action="#">
                    <input type="email" placeholder="Your Email Address" />
                    <button className="luminix-default-btn pill d-block extra-padding2">Subscribe now 
                      <RightArrawWhitIcon />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SingleServiceArea;