import RightArrawWhitIcon from "@/svg/RightArrawWhitIcon";
import Image from "next/image";
import Link from "next/link";

// images import   
import team15_img from "@/assets/images/team/team15.png";
import email_img from "@/assets/images/team/email.svg";
import phone_img from "@/assets/images/team/phone.svg";

const SingleTeamArea = () => {
  return (
    <>
      <div className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              <div className="luminix-team-d-thumb" data-aos="fade-up" data-aos-duration="700">
                <Image width={416} height={500} src={team15_img} alt="here is theme image" />
              </div>
              <div className="luminix-team-d-contact-box">
                <a href="mailto:name@gamil.com">
                  <div className="luminix-team-d-contact-wrap">
                    <div className="luminix-team-d-contact-icon">
                      <Image width={32} height={25} src={email_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-team-d-contact-data">
                      <h6>Send Email:</h6>
                      <p>Support@gmail.com</p>
                    </div>
                  </div>
                </a>
                <a href="tel:+088">
                  <div className="luminix-team-d-contact-wrap mb-0">
                    <div className="luminix-team-d-contact-icon">
                      <Image width={30} height={31} src={phone_img} alt="here is theme image" />
                    </div>
                    <div className="luminix-team-d-contact-data">
                      <h6>Phone Call:</h6>
                      <p>+088-345-9876</p>
                    </div>
                  </div>
                </a>
                <Link href="/contact-us" className="luminix-default-btn pill d-block mt-50 luminix-main-field">Contact Me 
                  <RightArrawWhitIcon />
                </Link>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="luminix-team-d-content pl-120">
                <h2>James Bennett</h2>
                <h5>Founder and CEO</h5>
                <p>Ethan Anderson is the Founder and CEO of our Business Consulting. He plays a key role in overseeing the agency operations, growth and strategic direction.</p>
                <p>As the leader of the organization, he also sets the company vision, mission, and values. He spent 12+ years providing strategic direction and ensuring the organization's goals and objectives were met.</p>
              </div>
              <div className="luminix-team-d-skill-wrap pl-120">
                <h3>Professional Skills</h3>
                <p>Business consulting helps companies solve challenges, improve strategies, and drive growth. It offers expert advice tailored to enhance operations and performance.</p>
                <div className="luminix-skill-wrap pl-20">
                  <div className="luminix-skill-item item2">
                    <div className="luminix-skill-title title3">
                      <h5>Problem-Solving Skills:</h5>
                    </div>
                    <div className="luminix-skill-line line3">
                      <div className="luminix-skill-bar bar-four"></div>
                    </div>
                  </div>
                  <div className="luminix-skill-item item2">
                    <div className="luminix-skill-title title3">
                      <h5>Networking Skills:</h5>
                    </div>
                    <div className="luminix-skill-line2 line3">
                      <div className="luminix-skill-bar2 bar-five"></div>
                    </div>
                  </div>
                  <div className="luminix-skill-item item2">
                    <div className="luminix-skill-title title3">
                      <h5>Leadership Skills:</h5>
                    </div>
                    <div className="luminix-skill-line2 line3">
                      <div className="luminix-skill-bar2 bar-six"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SingleTeamArea;