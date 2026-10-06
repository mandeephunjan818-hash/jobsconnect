


import socialLinks from "@/data/socialLinks";
import team_data from "@/data/team-data";
import Image from "next/image";
import Link from "next/link";


const TeamArea = () => {
  return (
    <div className="luminix-padding-section4">
      <div className="container">
        <div className="luminix-section-title center">
          <h2>Meet our excellent team members</h2>
        </div>
        <div className="row">
          {team_data.map((member, index) => (
            <div className="col-lg-3 col-md-6" key={member.id}>
              <div
                className="luminix-team-wrap"
                data-aos="fade-up"
                data-aos-duration={500 + (index % 3) * 200}
              >
                <div className="luminix-team-thumb">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={306}
                    height={400}
                  />
                  <div className="luminix-team-content">
                    <Link href="/single-team">
                      <h5>{member.name}</h5>
                    </Link>
                    <p>{member.position}</p>
                    <div className="luminix-team-social">
                      <ul>
                        {socialLinks.map((link, index) => (
                          <li key={index}>
                            <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }}>

                            </Link>
                          </li>
                        ))}

                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamArea;