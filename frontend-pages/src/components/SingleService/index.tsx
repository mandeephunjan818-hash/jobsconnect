import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import SingleServiceArea from "./SingleServiceArea";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import FooterOne from "@/layouts/footers/FooterOne";
 
const SingleService = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Data Security" subtitle="Data Security" bg_img="singleservice-breadcrumb-bg" />
      <SingleServiceArea />
      <CtaHomeTwo />
      <FooterOne />      
    </Wrapper>
  );
};

export default SingleService;