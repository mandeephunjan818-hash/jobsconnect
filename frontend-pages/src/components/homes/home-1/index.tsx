import HeroHomeOne from "./HeroHomeOne";
import AboutHomeOne from "./AboutHomeOne";
// import WhyChooseHomeOne from "./WhyChooseHomeOne";
import Wrapper from "@/layouts/Wrapper";
import HeaderOne from "@/layouts/headers/HeaderOne";
import TestimonialHomeOne from "./TestimonialHomeOne";
import FooterOne from "@/layouts/footers/FooterOne";
// import BrandHomeThree from "../home-3/BrandHomeThree";
import BlogHomeTwo from "../home-2/BlogHomeTwo";
import PortfolioHomeTwo from "../home-2/PortfolioHomeTwo";
import JobListArea from "@/components/career/JobListArea";
import FaqArea from "@/components/faq/FaqArea";
import { getFaqs } from "@/app/actions/faqAction";
import { getJobSearchIndex } from "@/app/actions/jobSearchData";


const HomeOne = async () => {
  const sections = await getFaqs();
  const site = `${process.env.NEXT_PUBLIC_SITE_ID}`;
  console.log("the faq data", sections);

  const searchIndex = await getJobSearchIndex();

  return (
    <Wrapper>
      <HeaderOne />
      <HeroHomeOne searchIndex={searchIndex} />
      <JobListArea site="jobs-connect.vercel.app" />
      <AboutHomeOne pageIdentifier="home-two" />
      {/* <BrandHomeThree site="jobs-connect.vercel.app" /> */}
      {/* <WhyChooseHomeOne site="jobs-connect.vercel.app" /> */}
      <PortfolioHomeTwo />
      <TestimonialHomeOne />
      <FaqArea sections={sections} />
      <BlogHomeTwo />
      <FooterOne />
    </Wrapper>
  );
};

export default HomeOne;