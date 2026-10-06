import Link from "next/link";
import Image, { StaticImageData } from "next/image";
import tImg1 from '../../../public/images/team/img01.png';
import tImg2 from '../../../public/images/team/img02.png';
import tImg3 from '../../../public/images/team/img03.png';
import tImg4 from '../../../public/images/team/img04.png';
import tImg5 from '../../../public/images/team/img05.png';
import tImg6 from '../../../public/images/team/img06.png';
import tImg7 from '../../../public/images/team/img07.png';

interface TeamMember {
  src: StaticImageData;
  alt: string;
  delay: string;
  className: string;
}

const teamMembers: TeamMember[] = [
  { src: tImg1, alt: "Team member 1", delay: "0s", className: "member--one" },
  { src: tImg2, alt: "Team member 2", delay: "0.5s", className: "member--two" },
  { src: tImg3, alt: "Team member 3", delay: "1s", className: "member--three" },
  { src: tImg4, alt: "Team member 4", delay: "1.2s", className: "member--four" },
  { src: tImg5, alt: "Team member 5", delay: "1s", className: "member--five" },
  { src: tImg6, alt: "Team member 6", delay: "0.5s", className: "member--six" },
  { src: tImg7, alt: "Team member 7", delay: "0s", className: "member--seven" },
];

const TeamSection: React.FC = () => {
  return (
    <section className="team pt-85 pb-80">
      <div className="container">
        <div className="team-heading text-center pos-rel">
          <h2 className="title">Our team</h2>
          <ul className="team-member list-unstyled">
            {teamMembers.map(({ src, alt, delay, className }, index) => (
              <li
                key={index}
                className={`member ${className} wow zoomIn`}
                data-wow-delay={delay}
                data-wow-duration="600ms"
              >
                <div>
                  <Image src={src} alt={alt} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="team-wrap ul_li_between">
          <ul className="xb-item--skill list-unstyled">
            <li>Skilled and Experienced Team.</li>
            <li>Comprehensive IT Support.</li>
            <li>Expertise Across Technologies.</li>
            <li>24/7 Support and Monitoring.</li>
          </ul>
          <div className="team-btn">
            <Link href="/team" className="thm-btn thm-btn--fill_icon">
              <div className="xb-item--hidden-text">
                <span className="text">Meet our team</span>
              </div>
              <div className="xb-item--holder">
                <span className="xb-item--text">Meet our team</span>
                <div className="xb-item--icon">
                  <i className="far fa-long-arrow-right"></i>
                </div>
                <span className="xb-item--text">Meet our team</span>
              </div>
            </Link>
          </div>
          <div className="xb-item--holders">
            <h3 className="xb-item--title">
              Our dedicated IT experts team committed to your success
            </h3>
            <p className="xb-item--content">
              Our dedicated IT experts are committed to your success, delivering tailored, scalable
              solutions that drive growth and efficiency. Your success is our focus.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
