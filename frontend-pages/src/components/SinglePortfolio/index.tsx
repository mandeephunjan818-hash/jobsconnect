import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import SinglePortfolioArea from "./SinglePortfolioArea";
import FooterOne from "@/layouts/footers/FooterOne";


const SinglePortfolio = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Market Analysis" subtitle="Market Analysis" bg_img="singleportfolio-breadcrumb-bg" />
      <SinglePortfolioArea />
      <CtaHomeTwo />
      <FooterOne/>
    </Wrapper>
  );
};

export default SinglePortfolio;