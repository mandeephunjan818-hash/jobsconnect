import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
// import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import ContactArea from "./ContactArea";
// import GoogleMap from "./GoogleMap";
import FooterOne from "@/layouts/footers/FooterOne";


export default function Contactus() {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Contact Us" subtitle="Contact Us" bg_img="contactus-breadcrumb-bg" />
      <ContactArea />
      {/* <GoogleMap /> */}
      {/* <CtaHomeTwo /> */}
      <FooterOne />       
    </Wrapper>
  )
}
