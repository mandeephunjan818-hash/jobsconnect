import Image from 'next/image';
import Link from 'next/link';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Scrollbar from '../../components/scrollbar/scrollbar';
import CtaSection from '../../components/CtaSection/CtaSection';
import caseStudies from '../../api/case';
import icon from '../../public/images/icon/eye-icon.svg';
import caseImg from '../../public/images/service/cd-image.jpg';
import cIcon1 from '../../public/images/icon/csd-icon01.svg';
import cIcon2 from '../../public/images/icon/csd-icon02.svg';
import cIcon3 from '../../public/images/icon/csd-icon03.svg';
import cIcon4 from '../../public/images/icon/csd-icon04.svg';
import cIcon from '../../public/images/icon/check-icon.svg';



export default function CaseStudySingle() {
  return (
    <div className="body_wrap sco_agency">
      <Header />
      <section className="page-title pt-200 pos-rel bg_img" style={{ backgroundImage: `url(/images/bg/page_bg01.jpg)` }}>
        <div className="container">
          <div className="page-title-wrap">
            <div className="row mt-none-30 align-items-end">
              <div className="col-lg-9 mt-30">
                <div className="page-title-box">
                  <span className="sub-title">
                    <Image src={icon} alt="" width={20} height={20} /> Online media management..
                  </span>
                  <h2 className="title">
                    Discover our case studies <br /> highlighting transformative <br /> SEO and IT solutions
                  </h2>
                </div>
              </div>
              <div className="col-lg-3 mt-30">
                <div className="count-box">
                  <h2 className="number">
                    10<span className="suffix">+</span>
                  </h2>
                  <span className="text">our most popular <br /> casestudy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="csd-img pt-70 pb-65">
        <div className="container">
          <div className="item-details_image pos-rel">
            <Image src={caseImg} alt="" />
          </div>
        </div>
      </div>

      <div className="sd-ser-content_wrap pb-90">
        <div className="container">
          <div className="sd-ser-content">
            <h2 className="sd-title">Online media management boost your presence</h2>
            <p className="sd-content">
              Effective online media management is essential for businesses looking to strengthen their digital
              footprint... (trimmed for brevity)
            </p>
          </div>
        </div>
      </div>

      <div className="csd-ser_warp">
        <div className="container">
          <div className="csd-ser_inner ul_li_between">
            <div className="csd-item ul_li">
              <div className="xb-icon">
                <Image src={cIcon1} alt="" />
              </div>
              <h6 className="xb-text">
                client : <span> innomax</span>
              </h6>
            </div>
            <div className="csd-item ul_li">
              <div className="xb-icon">
                <Image src={cIcon2} alt="" />
              </div>
              <h6 className="xb-text">
                services : <span> Marketing</span>
              </h6>
            </div>
            <div className="csd-item ul_li">
              <div className="xb-icon">
                <Image src={cIcon3} alt="" />
              </div>
              <h6 className="xb-text">
                completed date : <span> 20-11-2024</span>
              </h6>
            </div>
            <div className="csd-item ul_li">
              <div className="xb-icon">
                <Image src={cIcon4} alt="" />
              </div>
              <h6 className="xb-text">
                location : <span> New York,NY,USA</span>
              </h6>
            </div>
          </div>
        </div>
      </div>

      <div className="sd-service_wrap pt-90 pb-130">
        <div className="container">
          <div className="sd-ser-outcome">
            <div className="sd-heading">
              <h2 className="sd-title">Project requirement</h2>
              <p className="sd-content">
                Our client seeks optimize presence across platforms... (trimmed)
              </p>
            </div>

            <div className="sd-list-item ul_li">
              <ul className="sd-ser-list list-unstyled">
                <li>
                  <Image src={cIcon} alt="" /> Platform Audit & Strategy Development.
                </li>
                <li>
                  <Image src={cIcon} alt="" /> Content Creation & Curation.
                </li>
              </ul>
            </div>

            <div className="sd-heading csd-heading pt-90">
              <h2 className="sd-title">Solution & result</h2>
              <p className="sd-content">
                <span>Solution:</span> Our online media management services streamline...
              </p>
            </div>

            <div className="similar-casestudy pt-80">
              <h2 className="similar-casestudy-title">Our similar casestudy</h2>
              <div className="row mt-none-30">
                {caseStudies.slice(3, 6).map((cases, i) => (
                  <div className="col-lg-4 col-md-6 mt-30" key={i}>
                    <div className="casestudy-item">
                      <div className="casestudy-img">
                        <Link href={'/casestudy-details'}>
                          <Image src={cases.img} alt="" />
                        </Link>
                        <div className="content_wrap">
                          <h3 className="item_title">{cases.title}</h3>
                          <span className="item_tag">{cases.slug}</span>
                        </div>
                      </div>
                      <Link href={'/casestudy-details'} className="xb-overlay"></Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CtaSection />
      <Footer />
      <Scrollbar />
    </div>
  );
}
