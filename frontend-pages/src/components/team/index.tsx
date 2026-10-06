import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import TeamArea from "./TeamArea";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import FooterOne from "@/layouts/footers/FooterOne";

 
const Team = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Our Team" subtitle="Our Team" bg_img="team-breadcrumb-bg" />
      <TeamArea />
      <CtaHomeTwo />
      <FooterOne />          
    </Wrapper>
  );
};

export default Team;