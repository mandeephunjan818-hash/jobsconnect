import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import ServiceArea from "./ServiceArea";
import TestimonialHomeOne from "../homes/home-1/TestimonialHomeOne";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import FooterOne from "@/layouts/footers/FooterOne";

 

const Service = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Service" subtitle="Service" bg_img="service-breadcrumb-bg" />
      <ServiceArea />
      <TestimonialHomeOne style_2={true} />
      <CtaHomeTwo />
      <FooterOne />        
    </Wrapper>
  );
};

export default Service;