import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import PricingHomeThree from "../homes/home-3/PricingHomeThree";
import BrandHomeThree from "../homes/home-3/BrandHomeThree";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import FooterOne from "@/layouts/footers/FooterOne";


const Pricing = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Pricing" subtitle="Pricing" bg_img="pricing-breadcrumb-bg" />
      <PricingHomeThree style_2={true} />
      <BrandHomeThree site="jobs-connect.vercel.app" style_2={true} />
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  );
};

export default Pricing;