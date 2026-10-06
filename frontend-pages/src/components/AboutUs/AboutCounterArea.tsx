
import Count from '@/common/count'
import counter_data from '@/data/counter-data'
import Image from 'next/image'
import about_img from "@/assets/images/about-us/about-01.png";
import author_img from "@/assets/images/about-us/author.png";

export default function AboutCounterArea() {
  return (
    <>
      <div className="luminix-about-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-5">
              <div className="luminix-about-thumb" data-aos="fade-up" data-aos-duration="700">
                <Image width={500} height={520} src={about_img} alt="here is theme image" />
                <div className="luminix-about-card3 card4">
                  <Image width={162} height={65} src={author_img} alt="here is theme image" />
                  <h6>The average rating is 4.8, making us the world's best business organization.</h6>
                </div>
              </div>
            </div>
            <div className="col-lg-7 d-flex align-items-center">
              <div className="luminix-default-content pl-100">
                <h2 className="title2">We create unique business ideas</h2>
                <p className="text text-justify">We believe that standard solutions do not fit dynamic growth. Our tailored strategies turn your vision into reality with innovative solutions. We focus on understanding your unique needs to provide customized business advice that sets you apart in a competitive marketplace.</p>
                <div className="luminix-list-icon-content">
                  <ul>
                    <li>
                      <svg
                        width="25"
                        height="24"
                        viewBox="0 0 25 24"
                        fill="none"
                        className="me-2"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        {/* 1. Define the gradient locally within the SVG */}
                        <defs>
                          <linearGradient id={`svg-accent-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                            {/* This maps directly to your gradient's underlying behavior, or uses the CSS variable color context */}
                            <stop offset="0%" stopColor="var(--purple-500)" />
                            <stop offset="100%" stopColor="var(--purple-100)" />
                          </linearGradient>
                        </defs>

                        {/* 2. Reference the gradient ID in the fill */}
                        <circle cx="12.5" cy="12" r="12" fill={`url(#svg-accent-gradient)`} />
                        <path
                          d="M7.5 12.5l3 3 7-7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Building stronger relationships that foster long-term loyalty and satisfaction.
                    </li>
                    <li>
                      <svg
                        width="25"
                        height="24"
                        viewBox="0 0 25 24"
                        fill="none"
                        className="me-2"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        {/* 1. Define the gradient locally within the SVG */}
                        <defs>
                          <linearGradient id={`svg-accent-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                            {/* This maps directly to your gradient's underlying behavior, or uses the CSS variable color context */}
                            <stop offset="0%" stopColor="var(--purple-500)" />
                            <stop offset="100%" stopColor="var(--purple-100)" />
                          </linearGradient>
                        </defs>

                        {/* 2. Reference the gradient ID in the fill */}
                        <circle cx="12.5" cy="12" r="12" fill={`url(#svg-accent-gradient)`} />
                        <path
                          d="M7.5 12.5l3 3 7-7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Utilizing powerful online tools to amplify your reach and visibility.
                    </li>
                    <li>
                      <svg
                        width="25"
                        height="24"
                        viewBox="0 0 25 24"
                        fill="none"
                        className="me-2"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        {/* 1. Define the gradient locally within the SVG */}
                        <defs>
                          <linearGradient id={`svg-accent-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                            {/* This maps directly to your gradient's underlying behavior, or uses the CSS variable color context */}
                            <stop offset="0%" stopColor="var(--purple-500)" />
                            <stop offset="100%" stopColor="var(--purple-100)" />
                          </linearGradient>
                        </defs>

                        {/* 2. Reference the gradient ID in the fill */}
                        <circle cx="12.5" cy="12" r="12" fill={`url(#svg-accent-gradient)`} />
                        <path
                          d="M7.5 12.5l3 3 7-7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Diversifying capabilities to capture new market opportunities.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <section className="luminix-counter-wrap">
            {counter_data.map((item, i) => (
              <div className="luminix-counter-item" key={i}>
                <h2 className="luminix-counter-data">
                  <Count number={item.value} text={item.text} />
                </h2>
                <p>{item.label}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  )
}
