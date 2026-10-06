
import HeaderOne from '@/layouts/headers/HeaderOne'
import Wrapper from '@/layouts/Wrapper'
import CtaHomeTwo from '../homes/home-2/CtaHomeTwo'
import Link from 'next/link'
// import Image from 'next/image'
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon'

// images import  
// import error_img from "@/assets/images/v3/404.png";
import FooterOne from '@/layouts/footers/FooterOne'

export default function ErrorArea() {
  return (
    <Wrapper>
      <HeaderOne />
      <div className="luminix-error-section light-bg1">
        <div className="container">
          <div className="luminix-error-content">
            {/* <div className="luminix-error-thumb" data-aos="fade-up" data-aos-duration="700">
              <Image width={753} height={308} src={error_img} alt="here is theme image" />
            </div> */}
            <h2 className="title pt-0">Oops... Page Not Found!</h2>
            <p className="text">We're sorry but we can't find the page you requested. This may be because you typed the web address incorrectly.</p>
            <Link href="/" className="luminix-default-btn pill mt-50">Back to Home 
              <RightArrawWhitIcon />
            </Link>
          </div>
        </div>
      </div>
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  )
}
