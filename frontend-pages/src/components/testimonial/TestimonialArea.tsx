 

import testimonial_data from "@/data/testimonial-data";
import Image from "next/image"; 

export default function TestimonialArea() {
  return (
    <section className="luminix-padding-section4">
      <div className="container">
        <div className="luminix-section-title center">
          <h2>Hear what our happy clients say</h2>
        </div>
        <div className="row">
          {testimonial_data.map((testimonial) => (
            <div className="col-xl-4 col-lg-6" key={testimonial.id}>
              <div 
                className="luminix-t-wrap wrap2 light-bg1 luminix-t-wrap wrap2 " 
                data-aos="fade-up" 
                data-aos-duration={testimonial.animationDuration}
              >
                <div className="luminix-t-header">
                  <Image 
                    src={testimonial.ratingImage} 
                    alt="Rating" 
                    width={140} 
                    height={40}
                  />
                  <Image 
                    src={testimonial.quoteImage} 
                    alt="Quote" 
                    width={56} 
                    height={42}
                  />
                </div>
                <div className="luminix-t-content">
                  <p>{testimonial.quote}</p>
                </div>
                <div className="luminix-t-author">
                  <div className="luminix-t-author-thumb">
                    <Image 
                      src={testimonial.author.avatar} 
                      alt={testimonial.author.name} 
                      width={60} 
                      height={60}
                    />
                  </div>
                  <div className="luminix-t-author-data">
                    <h6>{testimonial.author.name}</h6>
                    <p>{testimonial.author.position}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}