 
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';
import Image from 'next/image'; 


// images import  
import contact1_img from "@/assets/images/v1/contact1.png";



export default function ContactHomeOne() {
  return (
    <>
      <div className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-7 order-lg-2">
              <div className="luminix-contact-box pl-51">
                <div className="luminix-contact-title">
                  <h6>[Contact Us Directly]</h6>
                  <h2 className="title pb-0">Send us a message</h2>
                </div>
                
                <form>
                  <div className="luminix-main-field">
                    <input type="text" placeholder="Name" />
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="luminix-main-field">
                        <input type="email" placeholder="Email" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="luminix-main-field">
                        <input type="text" placeholder="Phone Number" />
                      </div>
                    </div>
                  </div>
                  <div className="luminix-main-field-textarea">
                    <textarea className="button-text" name="textarea" placeholder="Message"></textarea>
                  </div>
                  <button className="luminix-default-btn pill" type="button">Send Message
                    <RightArrawWhitIcon />
                  </button>
                </form>
              </div>
            </div>
            <div className="col-lg-5 ">
              <div className="luminix-contact-thumb" data-aos="fade-up" data-aos-duration="700">
                <Image width={470} height={646} src={contact1_img} alt="here is theme image" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
