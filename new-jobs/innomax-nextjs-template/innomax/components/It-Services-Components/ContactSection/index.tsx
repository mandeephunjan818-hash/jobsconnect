import React from 'react';
import Link from "next/link";
import ContactForm from '../ContactFrom/ContactForm';
import cImg from '../../../public/contact-image.png';
import Image from 'next/image';

interface ContactSectionProps {

}

const ContactSection: React.FC<ContactSectionProps> = (props) => {
  return (
    <section className="contact pt-150 pb-150" style={{ backgroundColor: ' rgb(244, 245, 252)' }}>
      <div className="container">
        {/* <div className="contact-top ul_li flex-nowrap">
          {[{ icon: icon1, rating: "4.8", starClass: "fas fa-star-half-alt" },
            { icon: icon2, rating: "5.0", starClass: "fas fa-star" },
            { icon: icon3, rating: "5.0", starClass: "fas fa-star" }
          ].map(({ icon, rating, starClass }, i) => (
            <div key={i} className="cont_item ul_li">
              <span className="xb-item--star"><i className={starClass}></i></span>
              <span className="xb-item--rating_num">{rating}</span>
              <span className="xb-item--logo"><Image src={icon} alt={`Rating icon ${i + 1}`} /></span>
            </div>
          ))}
        </div> */}

        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-12">
            <div className="contact-wrap wow fadeInLeft bg-white" data-delay="100ms" data-wow-duration="600ms">
              <div className="xb-item--holder">
                {/* <span className="xb-item--sub-title"><Image src={icon4} alt="Direct box icon" /> Let&apos;s connect!</span> */}
                <div>
                  <div className="sub-title wow fadeInDown tm-badge" data-wow-duration="600ms">
                    <i className="fal fa-newspaper me-2" aria-hidden="true" /> Let&apos;s connect!
                  </div>
                </div>
                <h2 className="xb-item--title">
                  Send us a message, and we&apos;ll promptly <br /> discuss your project with you.
                </h2>
              </div>
              <ContactForm />
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            <div className="contact-info wow fadeInRight" data-delay="100ms" data-wow-duration="600ms">
              <div className="xb-item--img">
                <Image src={cImg} alt="Contact image" />
              </div>
              {/* <div className="xb-item--author">
                <h3 className="xb-item--name">Niko Rockensub</h3>
                <span className="xb-item--desig">Chief Operating Officer (COO)</span>
              </div> */}
              <ul className="social-icon list-unstyled ul_li">
                {/* Social icons with links */}
                <li>
                  <span>
                    <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.5001 0.00830078C6.49199 0.00830078 0 6.50029 0 14.5084C0 21.6907 5.22757 27.6389 12.0818 28.7907V17.5335H8.58392V13.4825H12.0818V10.4954C12.0818 7.02959 14.1986 5.1409 17.2908 5.1409C18.7718 5.1409 20.0445 5.25126 20.414 5.29987V8.9226L18.2693 8.92363C16.588 8.92363 16.2639 9.72242 16.2639 10.895V13.4804H20.2756L19.7524 17.5314H16.2639V28.8876C23.4381 28.0144 29 21.9147 29 14.5042C29 6.50029 22.508 0.00830078 14.5001 0.00830078Z" fill="#111112" />
                    </svg>
                  </span>
                  <Link className="xb-overlay" href="/contact" />
                </li>
                <li>
                  <span>
                    <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 14.0823C0 6.30512 6.28523 0 14.0379 0C21.7905 0 28.0757 6.30512 28.0757 14.0823C28.0757 21.8594 21.7905 28.1646 14.0379 28.1646C6.28523 28.1646 0 21.8594 0 14.0823ZM21.5831 5.80078L15.5736 12.8084H15.5733L22.1092 22.3503H17.3024L12.9011 15.9248L7.39074 22.3503H5.96661L12.2688 15.0018L5.96661 5.80078H10.7734L14.941 11.8854L20.159 5.80078H21.5831ZM10.0912 6.87625H7.90386L17.9723 21.3237H20.1597L10.0912 6.87625Z" fill="black" />
                    </svg>
                  </span>
                  <Link className="xb-overlay" href="/contact" />
                </li>
                <li>
                  <span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.9424 0H2.05764C1.51186 0.000884539 0.988708 0.218605 0.602961 0.605399C0.217215 0.992193 0.000370739 1.51647 0 2.06323V21.9368C0.000373291 22.4835 0.217218 23.0078 0.602964 23.3946C0.98871 23.7814 1.51186 23.9991 2.05764 24H21.9424C22.4881 23.9991 23.0113 23.7814 23.397 23.3946C23.7828 23.0078 23.9996 22.4835 24 21.9368V2.06323C23.9996 1.51647 23.7828 0.992193 23.397 0.605399C23.0113 0.218605 22.4881 0.000884539 21.9424 0ZM3.9839 4.84645C3.98461 4.56247 4.09766 4.29034 4.2983 4.08972C4.49893 3.88909 4.77078 3.77632 5.05426 3.77613H6.71196C6.99524 3.7764 7.26685 3.88925 7.46716 4.08992C7.66747 4.29058 7.78012 4.56267 7.78039 4.84645V6.50903C7.78012 6.79282 7.66747 7.0649 7.46716 7.26557C7.26685 7.46623 6.99524 7.57909 6.71196 7.57935H5.05426C4.77078 7.57916 4.49893 7.46639 4.2983 7.26577C4.09766 7.06514 3.98461 6.79302 3.9839 6.50903V4.84645ZM8.20737 19.8929C8.20752 19.9804 8.17302 20.0644 8.11145 20.1264C8.04988 20.1885 7.96626 20.2235 7.87892 20.2239H3.89889C3.81156 20.2235 3.72793 20.1885 3.66636 20.1264C3.60479 20.0644 3.57029 19.9804 3.57044 19.8929V8.2471C3.57029 8.15961 3.60479 8.07563 3.66636 8.01359C3.72793 7.95154 3.81156 7.9165 3.89889 7.91613H7.87892C7.96626 7.9165 8.04988 7.95154 8.11145 8.01359C8.17302 8.07563 8.20752 8.15961 8.20737 8.2471V19.8929ZM20.4296 19.8929C20.4297 19.9804 20.3952 20.0644 20.3336 20.1264C20.2721 20.1885 20.1884 20.2235 20.1011 20.2239H16.8862C16.7988 20.2235 16.7152 20.1885 16.6536 20.1264C16.5921 20.0644 16.5576 19.9804 16.5577 19.8929V13.5542C16.5577 12.9929 16.4959 12.2013 15.9588 11.8065C15.2594 11.2897 14.3474 11.5355 13.8084 12.0426C13.4452 12.3813 13.2694 12.9019 13.2694 13.6335V19.8929C13.2691 19.9806 13.2342 20.0646 13.1723 20.1266C13.1104 20.1886 13.0265 20.2236 12.939 20.2239H9.72597C9.63844 20.2236 9.55457 20.1886 9.49267 20.1266C9.43078 20.0646 9.39588 19.9806 9.39559 19.8929V8.2471C9.39588 8.15941 9.43078 8.07539 9.49267 8.01339C9.55457 7.95138 9.63844 7.91642 9.72597 7.91613H12.939C13.0265 7.91642 13.1104 7.95138 13.1723 8.01339C13.2342 8.07539 13.2691 8.15941 13.2694 8.2471V8.49097C13.2945 8.47548 13.3196 8.45806 13.3447 8.44258C14.0651 7.99281 14.8974 7.75536 15.7463 7.75742C17.1257 7.75742 18.2637 8.21419 19.1331 9.11613C20.2054 10.229 20.4296 11.7774 20.4296 12.8787V19.8929Z" fill="#111112" />
                    </svg>
                  </span>
                  <Link className="xb-overlay" href="/contact" />
                </li>
                <li>
                  <span>
                    <svg width="29" height="30" viewBox="0 0 29 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0.86438 15.0003C0.86438 7.18789 7.16393 0.852539 14.9322 0.852539C22.7004 0.852539 29 7.18789 29 15.0003C29 22.8126 22.7004 29.148 14.9322 29.148C7.16393 29.148 0.86438 22.8126 0.86438 15.0003ZM23.3605 19.2675C23.7224 17.884 23.7224 15.0147 23.7224 15.0147C23.7224 15.0147 23.737 12.1313 23.3605 10.7477C23.1576 9.9904 22.5639 9.39307 21.8109 9.18928C20.4351 8.81064 14.9322 8.81064 14.9322 8.81064C14.9322 8.81064 9.42922 8.81064 8.05348 9.17482C7.31484 9.37861 6.7065 9.9904 6.50386 10.7477C6.14174 12.1313 6.14174 15.0003 6.14174 15.0003C6.14174 15.0003 6.14174 17.884 6.50386 19.2528C6.70671 20.0101 7.30046 20.6075 8.05348 20.8112C9.4436 21.1899 14.9322 21.1899 14.9322 21.1899C14.9322 21.1899 20.4351 21.1899 21.8109 20.8257C22.5639 20.6219 23.1576 20.0248 23.3605 19.2675ZM17.756 15.0006L13.1799 17.6512V12.3501L17.756 15.0006Z" fill="#111112" />
                    </svg>
                  </span>
                  <Link className="xb-overlay" href="/contact" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section >
  );
};

export default ContactSection;
