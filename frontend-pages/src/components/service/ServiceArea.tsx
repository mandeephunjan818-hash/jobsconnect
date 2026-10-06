 
import Link from "next/link";
import Image from "next/image"; 
import service_data from "@/data/service-data";
import RightArrawSmallIcon from "@/svg/RightArrawSmallIcon";

const ServiceArea = () => {
  return (
    <section className="luminix-padding-section">
      <div className="container">
        <div className="luminix-section-title center">
          <h2>Great services to run your business</h2>
        </div>
        <div className="row">
          {service_data.map((item) => (
            <div className="col-lg-4 col-md-6" key={item.id}>              
              <div
                className="luminix-service-wrap"
                data-aos="fade-up"
                data-aos-duration={item.delay}
              >
                <div className="luminix-service-icon">
                  <Image
                    src={item.icon}
                    alt={item.title}
                    width={item.width}
                    height={item.height}
                  />
                </div>
                <div className="luminix-service-content">
                  <h5>{item.title}</h5>
                  <p>{item.description}</p>
                </div>
                <div className="luminix-blog-btn">
                  <Link href="/single-service">
                    Read More 
                    <RightArrawSmallIcon />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceArea;
